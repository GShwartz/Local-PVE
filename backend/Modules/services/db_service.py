from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from Modules.database.db_models import AppUser, AuditLog, VMMetadata, UserSession, DiskMetadata


# ── Audit Log ─────────────────────────────────────────────────────────────────

async def log_action(
    db: AsyncSession,
    action: str,
    node: Optional[str] = None,
    vmid: Optional[int] = None,
    username: Optional[str] = None,
    user_id: Optional[int] = None,
    details: Optional[dict] = None,
    status: str = "success",
    error_message: Optional[str] = None,
) -> AuditLog:
    entry = AuditLog(
        action=action,
        node=node,
        vmid=vmid,
        username_snapshot=username,
        user_id=user_id,
        details=details,
        status=status,
        error_message=error_message,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(entry)
    await db.flush()
    return entry


async def get_audit_logs(
    db: AsyncSession,
    vmid: Optional[int] = None,
    node: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[AuditLog]:
    q = select(AuditLog).order_by(AuditLog.timestamp.desc())
    if vmid is not None:
        q = q.where(AuditLog.vmid == vmid)
    if node is not None:
        q = q.where(AuditLog.node == node)
    if action is not None:
        q = q.where(AuditLog.action == action)
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    return list(result.scalars().all())


# ── VM Metadata ───────────────────────────────────────────────────────────────

async def get_vm_metadata(db: AsyncSession, node: str, vmid: int) -> Optional[VMMetadata]:
    result = await db.execute(
        select(VMMetadata).where(VMMetadata.node == node, VMMetadata.vmid == vmid)
    )
    return result.scalar_one_or_none()


async def upsert_vm_metadata(
    db: AsyncSession,
    node: str,
    vmid: int,
    notes: Optional[str] = None,
    tags: Optional[str] = None,
) -> VMMetadata:
    now = datetime.now(timezone.utc)
    stmt = (
        pg_insert(VMMetadata)
        .values(node=node, vmid=vmid, notes=notes, tags=tags, updated_at=now)
        .on_conflict_do_update(
            constraint="uq_vm_metadata_node_vmid",
            set_={"notes": notes, "tags": tags, "updated_at": now},
        )
        .returning(VMMetadata)
    )
    result = await db.execute(stmt)
    await db.flush()
    return result.scalar_one()


# ── User Sessions ─────────────────────────────────────────────────────────────

async def create_session(
    db: AsyncSession,
    proxmox_ticket: str,
    proxmox_csrf_token: str,
    proxmox_username: Optional[str] = None,
    user_id: Optional[int] = None,
    ttl_seconds: int = 7200,
) -> UserSession:
    now = datetime.now(timezone.utc)
    session = UserSession(
        session_id=str(uuid4()),
        user_id=user_id,
        proxmox_ticket=proxmox_ticket,
        proxmox_csrf_token=proxmox_csrf_token,
        proxmox_username=proxmox_username,
        created_at=now,
        expires_at=now + timedelta(seconds=ttl_seconds),
        is_active=True,
    )
    db.add(session)
    await db.flush()
    return session


async def get_session(db: AsyncSession, session_id: str) -> Optional[UserSession]:
    result = await db.execute(
        select(UserSession).where(
            UserSession.session_id == session_id,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.now(timezone.utc),
        )
    )
    return result.scalar_one_or_none()


async def invalidate_session(db: AsyncSession, session_id: str) -> None:
    await db.execute(
        update(UserSession)
        .where(UserSession.session_id == session_id)
        .values(is_active=False)
    )


# ── App Users ─────────────────────────────────────────────────────────────────

async def get_user_by_username(db: AsyncSession, username: str) -> Optional[AppUser]:
    result = await db.execute(
        select(AppUser).where(AppUser.username == username, AppUser.is_active == True)
    )
    return result.scalar_one_or_none()


async def create_app_user(
    db: AsyncSession,
    username: str,
    password_hash: str,
    role: str = "viewer",
) -> AppUser:
    user = AppUser(username=username, password_hash=password_hash, role=role)
    db.add(user)
    await db.flush()
    return user


# ── Disk Metadata ─────────────────────────────────────────────────────────────

async def upsert_disk_metadata(
    db: AsyncSession,
    vmid: int,
    node: str,
    disk_key: str,
    disk_uuid: Optional[str] = None,
    disk_type: Optional[str] = None,
    note: Optional[str] = None,
) -> DiskMetadata:
    now = datetime.now(timezone.utc)
    stmt = (
        pg_insert(DiskMetadata)
        .values(vmid=vmid, node=node, disk_key=disk_key,
                disk_uuid=disk_uuid, disk_type=disk_type, note=note, updated_at=now)
        .on_conflict_do_update(
            constraint="uq_disk_metadata_vmid_disk_key",
            set_={"disk_uuid": disk_uuid, "disk_type": disk_type, "note": note, "updated_at": now},
        )
        .returning(DiskMetadata)
    )
    result = await db.execute(stmt)
    await db.flush()
    return result.scalar_one()


async def get_disk_metadata(
    db: AsyncSession, vmid: int, disk_key: str
) -> Optional[DiskMetadata]:
    result = await db.execute(
        select(DiskMetadata).where(
            DiskMetadata.vmid == vmid,
            DiskMetadata.disk_key == disk_key,
        )
    )
    return result.scalar_one_or_none()
