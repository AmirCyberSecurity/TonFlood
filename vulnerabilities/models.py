from django.db import models

class UserRegister(models.Model):
    username = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    password = models.CharField(max_length=128)

    def __str__(self):
        return self.username