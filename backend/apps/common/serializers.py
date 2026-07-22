from rest_framework import serializers

from .models import CompanySettings, TransactionEvent
from .services.company_branding import get_company_branding, get_media_base_url


class CompanySettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = CompanySettings
        fields = [
            "company_name",
            "address",
            "email",
            "phone",
            "website",
            "tax_information",
            "support_email",
            "invoice_footer_text",
            "logo",
            "logo_url",
            "updated_at",
        ]
        read_only_fields = ["updated_at", "logo_url"]

    def get_logo_url(self, obj):
        if obj.logo:
            url = obj.logo.url
            if url.startswith("http://") or url.startswith("https://"):
                return url
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(url)
            return f"{get_media_base_url()}{url}"
        return get_company_branding()["logo_url"]


class TransactionEventSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = TransactionEvent
        fields = [
            "id",
            "module",
            "reference_number",
            "reference_id",
            "event_type",
            "description",
            "user",
            "user_email",
            "created_at",
        ]
        read_only_fields = fields
