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

@app.route("/", methods= ['GET','POST'])
@cross_origin()
def homepage(): # Redirecting to home page
    return render_template("index.html", )

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
