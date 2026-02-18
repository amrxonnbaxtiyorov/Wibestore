"""
WibeStore Backend - Games Models
"""

from django.db import models
from django.utils.text import slugify

from core.models import BaseModel
from core.validators import validate_hex_color


class Game(BaseModel):
    """Game model representing a game in the marketplace."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=10, blank=True, default="🎮", help_text="Emoji icon")
    image = models.ImageField(upload_to="games/", blank=True, null=True)
    color = models.CharField(
        max_length=7,
        default="#3B82F6",
        validators=[validate_hex_color],
        help_text="Hex color code (e.g., #FF5733)",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "games"
        ordering = ["sort_order", "name"]
        verbose_name = "Game"
        verbose_name_plural = "Games"

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def active_listings_count(self) -> int:
        return self.listings.filter(status="active").count()


class Category(BaseModel):
    """Category/Genre for games (optional hierarchical structure)."""

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "categories"
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
