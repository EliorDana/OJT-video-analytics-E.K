import os
from flask import Flask, request, send_from_directory, render_template,Response
from flask_cors import CORS, cross_origin
from google.cloud import storage
import sys

CERTS = None
AUDIENCE = None

execution_path = os.getcwd()
storage_client = storage.Client()
bucket_name = "result_bucket_video"

app = Flask(__name__, template_folder='templates')
CORS(app)

def certs():
    """Returns a dictionary of current Google public key certificates for
    validating Google-signed JWTs. Since these change rarely, the result
    is cached on first request for faster subsequent responses.
    """
    import requests

    global CERTS
    if CERTS is None:
        response = requests.get(
            'https://www.gstatic.com/iap/verify/public_key'
        )
        CERTS = response.json()
    return CERTS


def get_metadata(item_name):
    """Returns a string with the project metadata value for the item_name.
    See https://cloud.google.com/compute/docs/storing-retrieving-metadata for
    possible item_name values.
    """
    import requests

    endpoint = 'http://metadata.google.internal'
    path = '/computeMetadata/v1/project/'
    path += item_name
    response = requests.get(
        '{}{}'.format(endpoint, path),
        headers={'Metadata-Flavor': 'Google'}
    )
    metadata = response.text
    return metadata


def audience():
    """Returns the audience value (the JWT 'aud' property) for the current
    running instance. Since this involves a metadata lookup, the result is
    cached when first requested for faster future responses.
    """
    global AUDIENCE
    if AUDIENCE is None:
        project_number = get_metadata('numeric-project-id')
        project_id = get_metadata('project-id')
        AUDIENCE = '/projects/{}/apps/{}'.format(
            project_number, project_id
        )
    return AUDIENCE


def validate_assertion(assertion):
    """Checks that the JWT assertion is valid (properly signed, for the
    correct audience) and if so, returns strings for the requesting user's
    email and a persistent user ID. If not valid, returns None for each field.
    """
    from jose import jwt

    try:
        info = jwt.decode(
            assertion,
            certs(),
            algorithms=['ES256'],
            audience=audience()
            )
        print("info: ",info)
        return info['email'], info['sub']
    except Exception as e:
        print('Failed to validate assertion: {}'.format(e), file=sys.stderr)
        return None, None


@app.route('/', methods=['GET', 'POST'])
def say_hello():
    from flask import request

    assertion = request.headers.get('X-Goog-IAP-JWT-Assertion')
    email, id = validate_assertion(assertion)
    page = "<h1>Hello {}</h1>".format(assertion)
    return page

# @app.route("/", methods= ['GET','POST'])
# @cross_origin()
# def homepage():
#     print("----------------------< MY PRINT >--------------------------")
#     if request.headers.get('X-Goog-Authenticated-User-Email'):
#         email = request.headers.get('X-Goog-Authenticated-User-Email')
#         print(f"email: {email}")
#         return render_template("index.html", email=email)
#     else:
#         return render_template("index.html")

# @app.route("/", methods= ['GET','POST'])
# @cross_origin()
# def homepage(): # Redirecting to home page
#     return render_template("index.html", )

@app.route("/get_json", methods= ['GET','POST']) # Receives loaded file name and requests JSON file 
def get_json():
    data = request.get_data('user_input')
    data = str(data, 'utf-8')
    bucket = storage_client.get_bucket(bucket_name)
    blobs = list(bucket.list_blobs())
    for blob in blobs:
        if data in blob.name:
            print(blob.name)
            print(f"data: {data}")
            blob.download_to_filename(f"{data}")
            print("File downloaded")
            json_file = send_from_directory(execution_path, f"{data}")
            os.remove(data)
            print("File sent")
            return json_file

@app.route("/<path:path>")
@cross_origin()
def static_dir(path):
    file_name = request.get_data('json_input')
    return send_from_directory("app/vms_json_file/", path)

@app.route('/video')
def video():
    return Response(generate_frames(),mimetype='multipart/x-mixed-replace; boundary=frame')


if __name__ == '__main__':
    app.run(port=int(os.environ.get("PORT", 8080)),host='0.0.0.0',debug=True)
