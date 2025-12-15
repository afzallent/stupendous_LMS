from django.urls import path
from xapi.views import StatementsView

app_name = 'xapi'

urlpatterns = [
    # xAPI LRS endpoints (per xAPI specification)
    path('statements/', StatementsView.as_view(), name='statements'),
]
