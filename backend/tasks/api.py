from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.pagination import paginate
from ninja_jwt.authentication import JWTAuth

from .models import Task
from .schemas import TaskIn, TaskOut, TaskUpdate

router = Router(tags=["tasks"], auth=JWTAuth())


@router.get("", response=list[TaskOut])
@paginate
def list_tasks(request, done: bool | None = None):
    qs = Task.objects.filter(owner=request.user)
    if done is not None:
        qs = qs.filter(done=done)
    return qs


@router.post("", response={201: TaskOut})
def create_task(request, payload: TaskIn):
    task = Task.objects.create(**payload.dict(), owner=request.user)
    return 201, task


@router.get("/{int:task_id}", response=TaskOut)
def get_task(request, task_id: int):
    return get_object_or_404(Task, id=task_id, owner=request.user)


@router.patch("/{int:task_id}", response=TaskOut)
def update_task(request, task_id: int, payload: TaskUpdate):
    task = get_object_or_404(Task, id=task_id, owner=request.user)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(task, field, value)
    task.save()
    return task


@router.delete("/{int:task_id}", response={204: None})
def delete_task(request, task_id: int):
    task = get_object_or_404(Task, id=task_id, owner=request.user)
    task.delete()
    return 204, None
