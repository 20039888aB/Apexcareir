from django.core.management.base import BaseCommand

from apps.inventory.services.catalogue_seed import seed_catalogue_items


class Command(BaseCommand):
    help = "Seed the medical product catalogue with standard surgical instruments and consumables."

    def handle(self, *args, **options):
        result = seed_catalogue_items()
        self.stdout.write(self.style.SUCCESS(f"Created categories: {result['created_categories']}"))
        self.stdout.write(self.style.SUCCESS(f"Created products: {result['created_products']}"))
        self.stdout.write(self.style.SUCCESS(f"Skipped existing: {result['existing_products']}"))
        self.stdout.write(self.style.SUCCESS(f"Total catalogue items defined: {result['total_catalogue_items']}"))
        if result["created_names"]:
            self.stdout.write("New items:")
            for name in result["created_names"]:
                self.stdout.write(f"  - {name}")
