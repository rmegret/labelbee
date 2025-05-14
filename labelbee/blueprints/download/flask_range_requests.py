import os
import mimetypes
import re

from flask import request, send_file, Response, send_from_directory
from flask import render_template, make_response, jsonify, current_app
from werkzeug.exceptions import BadRequest, NotFound, Forbidden
from werkzeug.security import safe_join



# Enable range requests 
# https://blog.asgaard.co.uk/2012/08/03/http-206-partial-content-for-flask-python
#@app.after_request
#def after_request(response):
#    response.headers.add('Accept-Ranges', 'bytes')
#    return response

def dir_listing(directory, dirname='', base_uri='/', show_hidden=False, format='html'):
    # Joining the base dir and the requested relative dir
    abs_path = os.path.join(directory, dirname)
    #abs_path = safe_join(directory, dirname)

    # Return 404 if path doesn't exist
    if not os.path.exists(abs_path):
        return abort(404)

    # Check if path is a file and serve
    if os.path.isfile(abs_path):
        return abort(406)
        #return send_file(abs_path)

    # Show directory contents
    files = [f for f in os.listdir(abs_path) if not f.startswith('.')]
    files = [os.path.normpath(f) for f in files]
    files.insert(0,'..')
    dir_uri = os.path.join(base_uri, dirname, '') # Add trailing /
    richfiles = [{"uri": os.path.normpath(os.path.join(dir_uri, f))+f'?format={format}', "filename": f} for f in files]
    if (format=='html'):
        return render_template('pages/files.html', dir_uri=dir_uri, files=files)
    else:
        response = make_response(render_template('pages/filebrowser.html', dirs=[], files=richfiles, format=format), 200)
        response.headers["Content-Type"] = "text/html"
        return response

def send_from_directory_partial(directory, filename, base_uri):
    """ 
        Simple wrapper around send_file which handles HTTP 206 Partial Content
        (byte ranges)
        TODO: handle all send_file args, mirror send_file's error handling
        (if it has any)
    """
    
    path = safe_join(directory, filename)
        
    print('send_from_directory_partial: looking for path="'+path+'"...')

    try:
        if os.path.isdir(path):
            print('Found directory '+path)
            return dir_listing(directory, filename, base_uri)
        elif not os.path.isfile(path):
            print('NotFound: '+path)
            raise NotFound()
    except (TypeError, ValueError):
        raise BadRequest()
    
    range_header = request.headers.get('Range', None)
    if not range_header: 
        print('send_from_directory_partial: REQUEST "'+filename+'" norange')
        print('  send_from_directory: '+directory+','+filename+'"')
        return send_from_directory(directory, filename)
    else:
        print('send_from_directory_partial: REQUEST "'+filename+'" range='+range_header)
    
    
    print('send_from_directory_partial: MIME='+mimetypes.guess_type(path)[0])
    
    size = os.path.getsize(path)    
    byte1, byte2 = 0, None
    
    m = re.search('(\d+)-(\d*)', range_header)
    g = m.groups()
    
    if g[0]: byte1 = int(g[0])
    if g[1]: byte2 = int(g[1])

    length = size - byte1
    if byte2 is not None:
        length = byte2 - byte1 + 1
        
    maxlength = 8*1024*1024 # (8MB chunks)
    if (length>maxlength):
        length=maxlength
    byte2 = byte1 + length - 1
    
    data = None
    with open(path, 'rb') as f:
        f.seek(byte1)
        data = f.read(length)

    rv = Response(data, 
        206,
        mimetype=mimetypes.guess_type(path)[0], 
        direct_passthrough=True)
    rv.headers.add('Content-Range', 'bytes {0}-{1}/{2}'.format(byte1, byte2, size))

    print('send_from_directory_partial: SENT range={0}-{1}/{2}'.format(byte1,byte2,size))

    return rv


def serve_files(base_dir, path, base_uri, direct_download_base_uri=None, format="html"):
    logger = current_app.logger

    filepath = safe_join(base_dir, path)
    uripath = safe_join(base_uri, path)

    logger.info("serve_files...")
    logger.info("filepath={}".format(filepath))
    logger.info("uripath={}".format(uripath))
    logger.info(f"format={format}")

    if not os.path.exists(filepath):
        raise BadRequest("GET " + base_uri + ': File not found "{}"'.format(filepath))

    if format == "html":
        if os.path.isfile(filepath):
            return send_from_directory_partial(base_dir, path, base_uri)
        if os.path.isdir(filepath):
            return dir_listing(filepath, "", uripath, show_hidden=False, format="html")
    elif format == "htmlpage":
        if os.path.isfile(filepath):
            #return f'send_from_directory_partial("{base_dir}", "{path}", "{base_uri}")'
            return send_from_directory_partial(base_dir, path, base_uri)
        if os.path.isdir(filepath):
            return dir_listing(filepath, "", uripath, show_hidden=False, format="htmlpage")
    elif format == "json":
        if os.path.isfile(filepath):
            raise BadRequest(
                "GET "
                + base_uri
                + ": Attempting to get file in JSON format. try format=html"
            )
        if os.path.isdir(filepath):
            items = os.listdir(filepath)
            # files = [f for f in items if f.endswith('.json') and os.path.isfile(safe_join(filepath,f))]
            files = [f for f in items if os.path.isfile(safe_join(filepath, f))]
            dirs = [f for f in items if os.path.isdir(safe_join(filepath, f))]
            if path != "":
                dirs.append("..")
            files_obj = [
                {
                    # url_for('send_data', path=os.path.join('config/labellist/',path,filename)),
                    "uri": os.path.normpath(os.path.join(base_uri, path, filename)),
                    "download_uri": os.path.normpath(os.path.join(direct_download_base_uri, path, filename)) if direct_download_base_uri is not None else None,
                    "filename": filename,
                    "path": os.path.normpath(os.path.join(path, filename)),
                }
                for filename in files
            ]
            dirs_obj = [
                {
                    # url_for('labellist_get', path=os.path.join(path,filename+'/'), format=format),
                    "uri": os.path.normpath(
                        os.path.join(base_uri, path, filename + "/")
                    ),
                    "download_uri": os.path.normpath(os.path.join(direct_download_base_uri, path, filename)) if direct_download_base_uri is not None else None,
                    "filename": filename + "/",
                    "path": os.path.normpath(os.path.join(path, filename + "/")),
                }
                for filename in dirs
            ]

            result = {
                "files": files_obj,
                "dirs": dirs_obj,
                "base_uri": base_uri,
                "path": path,
                "uri": uripath,
            }
            return jsonify(result)
        raise BadRequest("GET " + base_uri + ": Internal error")
    else:
        raise BadRequest(
            "GET " + base_uri + ': Unrecognized format "{}"'.format(format)
        )

    raise BadRequest("GET " + base_uri + ": Internal error")