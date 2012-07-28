#!/usr/bin/env python

import bottle
import taskw
import os

ROOT=os.path.curdir

w = taskw.TaskWarrior()

def decode(txt):
    return txt.encode('latin1').decode('utf-8')

@bottle.route('/tasks', method=['GET', 'POST'])
def cb():
    if bottle.request.method == 'GET':
        # fetch
        return w.load_tasks()
    else:
        if bottle.request.POST.get('action') == 'remove':
            # delete
            return w.task_done(uuid=bottle.request.params['uuid'])
        else:
            # new (shouldn't it be valid utf-8 already ??)
            d = {k: decode(v) for k,v in bottle.request.POST.items()}
            return w.task_add(**d)

@bottle.route('/edit', method='POST')
def cb():
    params = bottle.request.POST
    task = {'uuid': params.pk, params.name: params.value}
    i, t = w.task_update(task)
    return t

# static files

@bottle.route('/')
def cb():
    return bottle.static_file('index.html', root=ROOT)

@bottle.route('<pfx:re:.*>/favicon.ico')
def cb(pfx):
    return bottle.static_file('favicon.ico', root=ROOT+'/static/')

@bottle.route('/js/<fname:path>')
def cb(fname):
    return bottle.static_file(fname, root=ROOT+'/static/js/')

@bottle.route('/img/<fname:path>')
def cb(fname):
    return bottle.static_file(fname, root=ROOT+'/static/img/')

@bottle.route('/css/<fname:path>')
def cb(fname):
    return bottle.static_file(fname, root=ROOT+'/static/css/')

if __name__ == "__main__":
    bottle.debug(True)
    bottle.run(host='0.0.0.0', port=8888)

