from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from courses.models import Course, Lesson


class Quiz(models.Model):
    """Quiz model for assessments"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='quizzes')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, null=True, blank=True, related_name='quizzes')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    passing_score = models.IntegerField(
        default=70,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Minimum percentage to pass"
    )
    time_limit = models.IntegerField(
        null=True,
        blank=True,
        help_text="Time limit in minutes (null for unlimited)"
    )
    max_attempts = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1)],
        help_text="Maximum number of attempts allowed"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['course', 'created_at']
        verbose_name_plural = "Quizzes"
    
    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Question(models.Model):
    """Question model for quiz questions"""
    QUESTION_TYPES = [
        ('multiple_choice', 'Multiple Choice'),
        ('true_false', 'True/False'),
        ('short_answer', 'Short Answer'),
    ]
    
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='multiple_choice')
    points = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    order = models.PositiveIntegerField(default=0)
    explanation = models.TextField(blank=True, help_text="Explanation shown after answering")
    
    # For question bank (questions not assigned to a quiz yet)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='questions_created')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='question_bank', null=True, blank=True)
    is_in_bank = models.BooleanField(default=False, help_text="True if in question bank, False if assigned to quiz")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['quiz', 'order']
        constraints = [
            # is_in_bank is a denormalisation of "quiz IS NULL". Nothing kept
            # the two in agreement, so a bank question could carry a quiz (and
            # vanish from the bank view) or a quiz question could be flagged
            # as banked. The database now rejects both states outright.
            models.CheckConstraint(
                condition=(
                    models.Q(is_in_bank=True, quiz__isnull=True)
                    | models.Q(is_in_bank=False, quiz__isnull=False)
                ),
                name='question_bank_flag_matches_quiz',
            ),
        ]

    def save(self, *args, **kwargs):
        # Derive the flag from the relation so callers cannot disagree with
        # the constraint above. The relation is the source of truth.
        self.is_in_bank = self.quiz_id is None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.question_text[:50]}..."


class QuestionOption(models.Model):
    """Answer options for multiple choice questions"""
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    option_text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return f"{self.option_text[:30]}... ({'Correct' if self.is_correct else 'Incorrect'})"


class QuizAttempt(models.Model):
    """Student's attempt at a quiz"""
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts')
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    max_score = models.IntegerField(default=0)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    passed = models.BooleanField(default=False)
    attempt_number = models.IntegerField(default=1, help_text="Sequential attempt number for this student and quiz")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_taken = models.IntegerField(null=True, blank=True, help_text="Time taken in seconds")
    
    class Meta:
        ordering = ['-started_at']
        unique_together = []  # Allow multiple attempts
    
    def __str__(self):
        return f"{self.student.username} - {self.quiz.title} - {self.percentage}%"
    
    def calculate_score(self):
        """Calculate the score based on answers"""
        total_points = 0
        earned_points = 0
        
        for answer in self.answers.all():
            total_points += answer.question.points
            if answer.is_correct:
                earned_points += answer.question.points
        
        self.max_score = total_points
        self.score = earned_points
        self.percentage = (earned_points / total_points * 100) if total_points > 0 else 0
        self.passed = self.percentage >= self.quiz.passing_score
        self.save()


class QuizAnswer(models.Model):
    """Student's answer to a quiz question"""
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.ForeignKey(QuestionOption, on_delete=models.CASCADE, null=True, blank=True)
    text_answer = models.TextField(blank=True)
    is_correct = models.BooleanField(default=False)
    points_earned = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ('attempt', 'question')
    
    def __str__(self):
        return f"{self.attempt.student.username} - Q{self.question.id}"
    
    def check_answer(self):
        """Check if the answer is correct"""
        if self.question.question_type == 'multiple_choice':
            if self.selected_option and self.selected_option.is_correct:
                self.is_correct = True
                self.points_earned = self.question.points
            else:
                self.is_correct = False
                self.points_earned = 0
        elif self.question.question_type == 'true_false':
            if self.selected_option and self.selected_option.is_correct:
                self.is_correct = True
                self.points_earned = self.question.points
            else:
                self.is_correct = False
                self.points_earned = 0
        # Short answer requires manual grading
        self.save()
