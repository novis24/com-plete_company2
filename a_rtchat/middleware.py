# # a_rtchat/middleware.py
# import logging
# import traceback
# from django.http import JsonResponse, HttpResponseServerError
# from django.template import TemplateDoesNotExist, loader
# from django.conf import settings
# from django.core.exceptions import (
#     PermissionDenied, SuspiciousOperation, ValidationError, 
#     ObjectDoesNotExist, MultipleObjectsReturned
# )
# from django.db import IntegrityError, DataError, ProgrammingError
# from django.http import Http404

# logger = logging.getLogger(__name__)

# class GlobalExceptionMiddleware:
#     def __init__(self, get_response):
#         self.get_response = get_response

#     def __call__(self, request):
#         response = self.get_response(request)
#         return response

#     def process_exception(self, request, exception):
#         # Log the exception
#         self.log_exception(request, exception)
        
#         # Handle specific exceptions
#         if isinstance(exception, Http404):
#             return self.handle_404(request, exception)
#         elif isinstance(exception, PermissionDenied):
#             return self.handle_403(request, exception)
#         elif isinstance(exception, (SuspiciousOperation, ValidationError)):
#             return self.handle_400(request, exception)
#         elif isinstance(exception, (IntegrityError, DataError, ProgrammingError)):
#             return self.handle_database_error(request, exception)
#         elif isinstance(exception, (ObjectDoesNotExist, MultipleObjectsReturned)):
#             return self.handle_object_error(request, exception)
#         elif isinstance(exception, (ValueError, TypeError, AttributeError, KeyError, IndexError)):
#             return self.handle_client_error(request, exception)
#         else:
#             return self.handle_500(request, exception)

#     def log_exception(self, request, exception):
#         error_message = f"{type(exception).__name__}: {str(exception)}"
#         error_traceback = traceback.format_exc()
        
#         logger.error(
#             f"Error occurred: {error_message}\n"
#             f"Path: {request.path}\n"
#             f"Method: {request.method}\n"
#             f"User: {request.user}\n"
#             f"Traceback:\n{error_traceback}"
#         )

#     def handle_404(self, request, exception):
#         if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
#             return JsonResponse({
#                 'error': 'The page you are looking for does not exist.',
#                 'status': 404
#             }, status=404)
        
#         context = {
#             'error_code': 404,
#             'error_title': 'Page Not Found',
#             'error_message': 'The page you are looking for does not exist.',
#             'suggestions': [
#                 'Check the URL for typos',
#                 'Return to the homepage',
#                 'Use the search function to find what you need'
#             ]
#         }
#         return self.render_error_template(request, '404.html', context, 404)

#     def handle_403(self, request, exception):
#         if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
#             return JsonResponse({
#                 'error': 'You do not have permission to access this resource.',
#                 'status': 403
#             }, status=403)
        
#         context = {
#             'error_code': 403,
#             'error_title': 'Access Denied',
#             'error_message': 'You do not have permission to access this resource.',
#             'suggestions': [
#                 'Contact your administrator for access',
#                 'Check if you are logged in with the correct account',
#                 'Return to the homepage'
#             ]
#         }
#         return self.render_error_template(request, '403.html', context, 403)

#     def handle_400(self, request, exception):
#         if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
#             return JsonResponse({
#                 'error': 'Bad request. Please check your input.',
#                 'status': 400
#             }, status=400)
        
#         context = {
#             'error_code': 400,
#             'error_title': 'Bad Request',
#             'error_message': 'The request could not be understood or was missing required parameters.',
#             'suggestions': [
#                 'Check your input for errors',
#                 'Refresh the page and try again',
#                 'Contact support if the problem persists'
#             ]
#         }
#         return self.render_error_template(request, '400.html', context, 400)

#     def handle_database_error(self, request, exception):
#         if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
#             return JsonResponse({
#                 'error': 'A database error occurred. Please try again later.',
#                 'status': 500
#             }, status=500)
        
#         context = {
#             'error_code': 500,
#             'error_title': 'Database Error',
#             'error_message': 'We encountered a problem with our database. Our team has been notified.',
#             'suggestions': [
#                 'Try again in a few moments',
#                 'Refresh the page',
#                 'Contact support if the problem persists'
#             ]
#         }
#         return self.render_error_template(request, '500.html', context, 500)

#     def handle_object_error(self, request, exception):
#         if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
#             return JsonResponse({
#                 'error': 'The requested resource was not found.',
#                 'status': 404
#             }, status=404)
        
#         context = {
#             'error_code': 404,
#             'error_title': 'Resource Not Found',
#             'error_message': 'The item you are looking for could not be found.',
#             'suggestions': [
#                 'Check if the resource still exists',
#                 'Return to the previous page',
#                 'Use search to find similar items'
#             ]
#         }
#         return self.render_error_template(request, '404.html', context, 404)

#     def handle_client_error(self, request, exception):
#         if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
#             return JsonResponse({
#                 'error': 'Invalid request. Please check your input.',
#                 'status': 400
#             }, status=400)
        
#         context = {
#             'error_code': 400,
#             'error_title': 'Invalid Request',
#             'error_message': 'There was a problem with your request. Please check your input.',
#             'suggestions': [
#                 'Verify all required fields are filled',
#                 'Check for special characters',
#                 'Refresh the page and try again'
#             ]
#         }
#         return self.render_error_template(request, '400.html', context, 400)

#     def handle_500(self, request, exception):
#         if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
#             return JsonResponse({
#                 'error': 'An unexpected error occurred. Please try again later.',
#                 'status': 500
#             }, status=500)
        
#         context = {
#             'error_code': 500,
#             'error_title': 'Server Error',
#             'error_message': 'Something went wrong on our end. Our team has been notified.',
#             'suggestions': [
#                 'Try again in a few moments',
#                 'Refresh the page',
#                 'Contact support if the problem persists'
#             ]
#         }
#         return self.render_error_template(request, '500.html', context, 500)

#     def render_error_template(self, request, template_name, context, status_code):
#         try:
#             template = loader.get_template(f'errors/{template_name}')
#             return HttpResponseServerError(template.render(context, request))
#         except TemplateDoesNotExist:
#             # Fallback to basic error response
#             error_html = f"""
#             <!DOCTYPE html>
#             <html>
#             <head>
#                 <title>Error {context['error_code']} - {context['error_title']}</title>
#                 <style>
#                     body {{ font-family: Arial, sans-serif; margin: 40px; background: #f8f9fa; }}
#                     .error-container {{ max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
#                     .error-code {{ font-size: 48px; color: #dc3545; margin-bottom: 10px; }}
#                     .error-title {{ font-size: 24px; color: #343a40; margin-bottom: 20px; }}
#                     .error-message {{ color: #6c757d; margin-bottom: 30px; }}
#                     .suggestions {{ background: #f8f9fa; padding: 15px; border-radius: 5px; }}
#                     .suggestions ul {{ margin: 0; padding-left: 20px; }}
#                 </style>
#             </head>
#             <body>
#                 <div class="error-container">
#                     <div class="error-code">{context['error_code']}</div>
#                     <div class="error-title">{context['error_title']}</div>
#                     <div class="error-message">{context['error_message']}</div>
#                     <div class="suggestions">
#                         <strong>Suggestions:</strong>
#                         <ul>
#                             {"".join(f"<li>{suggestion}</li>" for suggestion in context['suggestions'])}
#                         </ul>
#                     </div>
#                 </div>
#             </body>
#             </html>
#             """
#             return HttpResponseServerError(error_html, status=status_code)