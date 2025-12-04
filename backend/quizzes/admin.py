from django.contrib import admin
from .models import Quiz, Question, QuestionOption, QuizAttempt, QuizAnswer


class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    extra = 2


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['question_text_short', 'question_type', 'quiz', 'points', 'is_in_bank']
    list_filter = ['question_type', 'is_in_bank', 'created_at']
    search_fields = ['question_text']
    inlines = [QuestionOptionInline]
    
    def question_text_short(self, obj):
        return obj.question_text[:50] + '...' if len(obj.question_text) > 50 else obj.question_text
    question_text_short.short_description = 'Question'


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'passing_score', 'time_limit', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'course']
    search_fields = ['title', 'description']


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ['student', 'quiz', 'score', 'max_score', 'percentage', 'passed', 'completed_at']
    list_filter = ['passed', 'completed_at', 'quiz']
    search_fields = ['student__username', 'quiz__title']
    readonly_fields = ['score', 'max_score', 'percentage', 'passed']


@admin.register(QuizAnswer)
class QuizAnswerAdmin(admin.ModelAdmin):
    list_display = ['attempt', 'question_short', 'is_correct', 'points_earned']
    list_filter = ['is_correct']
    
    def question_short(self, obj):
        return obj.question.question_text[:30] + '...'
    question_short.short_description = 'Question'
