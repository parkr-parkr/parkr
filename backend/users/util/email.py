from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth.models import User
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMessage
from ..models import PasswordResetToken

def send_verification_email(user, verification_token):
    verification_link = f"{settings.FRONTEND_URL}/verify-email/{verification_token.token}"  # Replace with your actual frontend URL

    # Render the HTML email template
    subject = 'Parkr Email Verification'
    html_message = render_to_string('email_verification.html', {'verification_link': verification_link})
    message = "This is a fallback text message in case HTML rendering fails."  # Plain text message

    # Send email
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        html_message=html_message
    )

def send_forgot_password_email(user, uidb64, reset_token):
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{uidb64}/{reset_token}"

    subject = "Parkr Password Reset Request"
    html_message = render_to_string('reset_password.html', {'reset_link': reset_url})
    message = "This is a fallback text message in case HTML rendering fails."

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        html_message=html_message
    )
 
