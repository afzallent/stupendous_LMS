from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import User

class CustomUserCreationForm(UserCreationForm):
    is_instructor = forms.BooleanField(required=False, label="I am an Instructor")

    class Meta(UserCreationForm.Meta):
        model = User
        fields = UserCreationForm.Meta.fields + ('email', 'is_instructor',)

    def save(self, commit=True):
        user = super().save(commit=False)
        user.is_student = not self.cleaned_data['is_instructor']
        if commit:
            user.save()
        return user
