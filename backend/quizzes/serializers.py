from rest_framework import serializers
from .models import Quiz, Question, QuestionOption, QuizAttempt, QuizAnswer


class QuestionOptionSerializer(serializers.ModelSerializer):
    """Serializer for question options"""
    class Meta:
        model = QuestionOption
        fields = ['id', 'option_text', 'is_correct', 'order']
        read_only_fields = ['id']
    
    def to_representation(self, instance):
        """Hide is_correct from students"""
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and not request.user.is_instructor:
            data.pop('is_correct', None)
        return data


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for questions"""
    options = QuestionOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Question
        fields = ['id', 'quiz', 'question_text', 'question_type', 'points', 
                  'order', 'explanation', 'options', 'created_at']
        read_only_fields = ['id', 'created_at']


class QuestionBankSerializer(serializers.ModelSerializer):
    """Serializer for question bank"""
    options = QuestionOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Question
        fields = ['id', 'question_text', 'question_type', 'points', 
                  'explanation', 'options', 'course', 'is_in_bank', 'created_at']
        read_only_fields = ['id', 'created_at', 'created_by']


class QuizSerializer(serializers.ModelSerializer):
    """Serializer for quiz list"""
    question_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = ['id', 'course', 'lesson', 'title', 'description', 
                  'passing_score', 'time_limit', 'max_attempts', 'is_active',
                  'question_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_question_count(self, obj):
        return obj.questions.count()


class QuizDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for quiz with questions"""
    questions = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()
    total_points = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = ['id', 'course', 'lesson', 'title', 'description', 
                  'passing_score', 'time_limit', 'max_attempts', 'is_active',
                  'questions', 'question_count', 'total_points', 
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_question_count(self, obj):
        return obj.questions.count()
    
    def get_total_points(self, obj):
        return sum(q.points for q in obj.questions.all())


class QuizAnswerSerializer(serializers.ModelSerializer):
    """Serializer for quiz answers"""
    class Meta:
        model = QuizAnswer
        fields = ['id', 'attempt', 'question', 'selected_option', 
                  'text_answer', 'is_correct', 'points_earned']
        read_only_fields = ['id', 'is_correct', 'points_earned']


class QuizAttemptSerializer(serializers.ModelSerializer):
    """Serializer for quiz attempts"""
    answers = QuizAnswerSerializer(many=True, read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    
    class Meta:
        model = QuizAttempt
        fields = ['id', 'quiz', 'quiz_title', 'student', 'score', 'max_score', 
                  'percentage', 'passed', 'started_at', 'completed_at', 
                  'time_taken', 'answers']
        read_only_fields = ['id', 'student', 'score', 'max_score', 'percentage', 
                            'passed', 'started_at', 'completed_at']


class QuizSubmissionSerializer(serializers.Serializer):
    """Serializer for quiz submission"""
    answers = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        )
    )
    
    def validate_answers(self, value):
        """Validate answer format"""
        for answer in value:
            if 'question_id' not in answer:
                raise serializers.ValidationError("Each answer must have a question_id")
            if 'selected_option_id' not in answer and 'text_answer' not in answer:
                raise serializers.ValidationError("Each answer must have either selected_option_id or text_answer")
        return value
