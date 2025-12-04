from rest_framework import permissions


class IsInstructorOrReadOnly(permissions.BasePermission):
    """
    Permission to allow instructors to create/edit courses,
    but allow anyone to read.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.is_instructor


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission to allow course owners to edit their courses,
    but allow anyone to read.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.instructor == request.user


class IsEnrolledStudent(permissions.BasePermission):
    """
    Permission to allow only enrolled students to view course lessons.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Check if user is enrolled in the course
        from .models import Enrollment
        return Enrollment.objects.filter(
            student=request.user,
            course=obj.course
        ).exists()
