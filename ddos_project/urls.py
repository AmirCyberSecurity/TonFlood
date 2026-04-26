from django.urls import path
from vulnerabilities import views

urlpatterns = [
    path('', views.menu, name='menu'),
    path('start', views.start, name='start'),
    path('run', views.run_task, name='run'),
    path('<path:anything>', views.custom_404),
]