"""
API URLs for quizzes app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'quizzes', views.QuizViewSet, basename='quiz')
router.register(r'questions', views.QuestionViewSet, basename='question')
router.register(r'quiz-bank', views.QuestionBankViewSet, basename='question-bank')

urlpatterns = [
    path('', include(router.urls)),
    # Custom question management endpoints
    path('quizzes/<int:quiz_id>/questions/<int:question_id>/', 
         views.QuestionManagementView.as_view(), 
         name='quiz-question-detail'),
]
