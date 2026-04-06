from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Integer, String, Text, Boolean, DateTime,
    ForeignKey, UniqueConstraint, Index, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from Modules.database.connection import Base


# ── 1. app_users ──────────────────────────────────────────────────────────────
class AppUser(Base):
    """
    Application-level users, separate from Proxmox auth.

    Ownership pattern: AppUser is the central hub. Every owned-entity table
    (vm_metadata, disk_metadata, and future tables like user_apps) carries an
    owner_user_id FK pointing back here. To add a new owned feature, create a
    new table with owner_user_id → app_users.id — no changes to this model needed.
    """
    __tablename__ = "app_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(
        String(32), nullable=False, default="viewer",
        comment="viewer | operator | admin"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── relationships (owned entities point here via owner_user_id FK) ────────
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="user")
    sessions: Mapped[list["UserSession"]] = relationship("UserSession", back_populates="user")
    vms: Mapped[list["VMMetadata"]] = relationship("VMMetadata", back_populates="owner")
    disks: Mapped[list["DiskMetadata"]] = relationship("DiskMetadata", back_populates="owner")
    # Future: apps, containers, networks, etc. follow the same pattern —
    # add the relationship here and owner_user_id FK on the new table.


# ── 2. audit_log ─────────────────────────────────────────────────────────────
class AuditLog(Base):
    """Immutable record of every state-changing action performed via the API."""
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("app_users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    username_snapshot: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True,
        comment="Proxmox username at time of action; denormalized for durability"
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    node: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    vmid: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="success",
        comment="success | failure"
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )

    user: Mapped[Optional["AppUser"]] = relationship("AppUser", back_populates="audit_logs")

    __table_args__ = (
        Index("ix_audit_log_node_vmid", "node", "vmid"),
    )


# ── 3. vm_metadata ────────────────────────────────────────────────────────────
class VMMetadata(Base):
    """
    Extra metadata (notes + tags) for VMs, keyed by (node, vmid).
    owner_user_id links this VM to an app_users row (nullable — unowned VMs allowed).
    """
    __tablename__ = "vm_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("app_users.id", ondelete="SET NULL"), nullable=True, index=True,
        comment="AppUser who owns this VM; NULL = unowned/shared"
    )
    node: Mapped[str] = mapped_column(String(64), nullable=False)
    vmid: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(
        String(512), nullable=True,
        comment="Comma-separated tag list, e.g. 'production,web,nginx'"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    owner: Mapped[Optional["AppUser"]] = relationship("AppUser", back_populates="vms")

    __table_args__ = (
        UniqueConstraint("node", "vmid", name="uq_vm_metadata_node_vmid"),
        Index("ix_vm_metadata_node_vmid", "node", "vmid"),
    )


# ── 4. user_sessions ─────────────────────────────────────────────────────────
class UserSession(Base):
    """Server-side session store. Clients hold only an opaque session_id."""
    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True,
        comment="UUID4 issued to the client as an opaque session identifier"
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    proxmox_ticket: Mapped[str] = mapped_column(Text, nullable=False)
    proxmox_csrf_token: Mapped[str] = mapped_column(Text, nullable=False)
    proxmox_username: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        comment="created_at + 2 hours (matching Proxmox ticket TTL)"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    user: Mapped[Optional["AppUser"]] = relationship("AppUser", back_populates="sessions")

    __table_args__ = (
        Index("ix_user_sessions_expires_at", "expires_at"),
    )


# ── 5. disk_metadata ─────────────────────────────────────────────────────────
class DiskMetadata(Base):
    """
    Per-disk metadata: UUID, OS-disk flag, notes. Keyed by (vmid, disk_key).
    owner_user_id links this disk to an app_users row (nullable — unowned disks allowed).
    """
    __tablename__ = "disk_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("app_users.id", ondelete="SET NULL"), nullable=True, index=True,
        comment="AppUser who owns this disk; NULL = unowned/shared"
    )
    vmid: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    node: Mapped[str] = mapped_column(String(64), nullable=False)
    disk_key: Mapped[str] = mapped_column(
        String(32), nullable=False,
        comment="Proxmox disk slot, e.g. scsi0, virtio1, ide2"
    )
    disk_uuid: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True,
        comment="Block device UUID from inside the guest (if known)"
    )
    disk_type: Mapped[Optional[str]] = mapped_column(
        String(16), nullable=True,
        comment="os | data | swap | cdrom"
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    owner: Mapped[Optional["AppUser"]] = relationship("AppUser", back_populates="disks")

    __table_args__ = (
        UniqueConstraint("vmid", "disk_key", name="uq_disk_metadata_vmid_disk_key"),
        Index("ix_disk_metadata_vmid_node", "vmid", "node"),
    )


# ── Future owned-entity template ──────────────────────────────────────────────
# To add a new user-owned feature (e.g. apps, containers, networks):
#
#   class UserApp(Base):
#       __tablename__ = "user_apps"
#       id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
#       owner_user_id: Mapped[Optional[int]] = mapped_column(
#           Integer, ForeignKey("app_users.id", ondelete="SET NULL"), nullable=True, index=True
#       )
#       # ... feature-specific columns ...
#       owner: Mapped[Optional["AppUser"]] = relationship("AppUser", back_populates="apps")
#
#   Then add to AppUser:
#       apps: Mapped[list["UserApp"]] = relationship("UserApp", back_populates="owner")
