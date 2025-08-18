import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.handlers.asgi import ASGIHandler
from django.core.asgi import get_asgi_application

# Set the Django settings module first
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kampuni.settings')

# Initialize the Django application
django.setup()

# Now that Django is set up, we can safely import from our app
from a_rtchat.routing import websocket_urlpatterns

# Your existing custom handler that serves static files
class StaticFilesHandler(ASGIHandler):
    def __init__(self, application):
        self.application = application
        from django.contrib.staticfiles.handlers import ASGIStaticFilesHandler
        self.staticfiles_handler = ASGIStaticFilesHandler(self.application)
    
    async def __call__(self, scope, receive, send):
        if scope['type'] == 'http' and scope['path'].startswith('/static/'):
            await self.staticfiles_handler(scope, receive, send)
        else:
            await self.application(scope, receive, send)

# This is the new, combined application router
django_asgi_app = get_asgi_application()
application = ProtocolTypeRouter({
    "http": StaticFilesHandler(django_asgi_app),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
