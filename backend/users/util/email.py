from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings

def send_verification_email(user, verification_token):
    verification_link = f"{settings.FRONTEND_URL}/verify-email?token={verification_token.token}"  # Replace with your actual frontend URL

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
 