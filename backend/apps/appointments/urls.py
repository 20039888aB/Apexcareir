from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AppointmentViewSet, ContactRequestViewSet

router = DefaultRouter()
router.register("appointments", AppointmentViewSet, basename="appointments")
router.register("contact-requests", ContactRequestViewSet, basename="contact-requests")

urlpatterns = [
    path("", include(router.urls)),
]
