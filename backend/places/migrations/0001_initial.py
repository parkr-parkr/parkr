# Generated by Django 5.1.7 on 2025-04-19 07:58

import django.db.models.deletion
import places.place_image.models
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Place',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('address', models.CharField(max_length=255)),
                ('city', models.CharField(max_length=100)),
                ('state', models.CharField(max_length=100)),
                ('zip_code', models.CharField(max_length=20)),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('price_per_hour', models.DecimalField(decimal_places=2, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='places', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Booking',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_time', models.DateTimeField()),
                ('end_time', models.DateTimeField()),
                ('booking_time', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('confirmed', 'Confirmed'), ('cancelled', 'Cancelled'), ('completed', 'Completed')], default='pending', max_length=20)),
                ('total_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('payment_id', models.CharField(blank=True, max_length=255, null=True)),
                ('payment_status', models.CharField(blank=True, max_length=50, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bookings', to=settings.AUTH_USER_MODEL)),
                ('place', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bookings', to='places.place')),
            ],
            options={
                'ordering': ['-booking_time'],
            },
        ),
        migrations.CreateModel(
            name='PlaceImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(blank=True, null=True, upload_to=places.place_image.models.listing_image_path)),
                ('image_key', models.CharField(blank=True, max_length=255)),
                ('is_primary', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('place', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='images', to='places.place')),
            ],
        ),
        migrations.CreateModel(
            name='BlockedPeriod',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_datetime', models.DateTimeField()),
                ('end_datetime', models.DateTimeField()),
                ('block_type', models.CharField(choices=[('owner-block', 'Owner Block'), ('maintenance', 'Maintenance'), ('booking', 'Booking')], max_length=20)),
                ('reason', models.CharField(blank=True, max_length=255)),
                ('is_recurring', models.BooleanField(default=False)),
                ('recurring_pattern', models.CharField(blank=True, choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('weekdays', 'Weekdays'), ('weekends', 'Weekends')], max_length=20, null=True)),
                ('recurring_end_date', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('booking', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='blocked_period', to='places.booking')),
                ('place', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='blocked_periods', to='places.place')),
            ],
            options={
                'indexes': [models.Index(fields=['place', 'start_datetime'], name='places_bloc_place_i_100d1e_idx'), models.Index(fields=['place', 'end_datetime'], name='places_bloc_place_i_50f970_idx')],
            },
        ),
    ]
