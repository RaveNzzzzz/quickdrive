from datetime import datetime

from ninja import Schema


class TaskIn(Schema):
    title: str
    description: str = ""


class TaskUpdate(Schema):
    title: str | None = None
    description: str | None = None
    done: bool | None = None


class TaskOut(Schema):
    id: int
    title: str
    description: str
    done: bool
    created_at: datetime
