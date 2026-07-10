from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Appointment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("full_name", models.CharField(max_length=255)),
                ("phone_number", models.CharField(max_length=30)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("county", models.CharField(max_length=120)),
                ("procedure_interest", models.CharField(blank=True, max_length=255)),
                ("preferred_date", models.DateField(blank=True, null=True)),
                ("preferred_time", models.CharField(blank=True, max_length=50)),
                ("message", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("confirmed", "Confirmed"),
                            ("completed", "Completed"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("admin_notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="appointment",
            index=models.Index(fields=["status", "created_at"], name="appointmen_status_227b07_idx"),
        ),
        migrations.AddIndex(
            model_name="appointment",
            index=models.Index(fields=["preferred_date"], name="appointmen_preferr_5f14f9_idx"),
        ),
        migrations.AddIndex(
            model_name="appointment",
            index=models.Index(fields=["full_name"], name="appointmen_full_na_4fd5c2_idx"),
        ),
        migrations.AddIndex(
            model_name="appointment",
            index=models.Index(fields=["phone_number"], name="appointmen_phone_n_0bdfd0_idx"),
        ),
    ]
