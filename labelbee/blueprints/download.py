from flask import render_template, render_template_string, jsonify, Blueprint, request, Response
from labelbee.flask_range_requests import send_from_directory_partial, dir_listing
from flask_user import current_user
import os
from labelbee import storage_api
import mimetypes
import re

bp = Blueprint('download', __name__, url_prefix='/')


#TODO: Send id in path
#TODO: Use storage api to get the bytes 
#TODO: Send bytes using partial thing 
@bp.route("/data/<storage_id>")
def send_data(storage_id):
    # TODO: Make strigs into constants
    # TODO: Use storage api to get the correct path
    print("getting bytes")
    print(request.headers)
    range_header = request.headers.get('Range', None)

    video_bytes = storage_api.get(storage_id)
    video_data = video_bytes["file"]
    size = len(video_data)

    # size = os.path.getsize(path)    
    byte1, byte2 = 0, None
    
    m = re.search('(\d+)-(\d*)', range_header)
    g = m.groups()
    print("caaaaa",g)
    if g[0]: byte1 = int(g[0])
    if g[1]: byte2 = int(g[1])

    print(byte1, byte2)
    length = size - byte1
    if byte2 is not None:
        length = byte2 - byte1 + 1
        
    maxlength = 8*1024*1024 # (8MB chunks)
    if (length>maxlength):
        length=maxlength
    byte2 = byte1 + length - 1
    
    # data = None
    # with open(path, 'rb') as f:
    #     f.seek(byte1)
    #     data = f.read(length)
    data = video_data[0: byte2]

    rv = Response(data, 
        206,    
        # mimetype=mimetypes.guess_type(path)[0], 
        direct_passthrough=True)
    # rv.headers.add('Content-Range', 'bytes {0}-{1}/{2}'.format(byte1, byte2, size))
    # print('send_from_directory_partial: SENT range={0}-{1}/{2}'.format(byte1,byte2,size))

    return rv
    # return Response("jeje salui2")
    # data_dir = os.path.join(bp.root_path, "../static/data")
    # return send_from_directory_partial(data_dir, path, "/data")
