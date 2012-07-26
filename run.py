#!/usr/bin/env python

import bottle
import taskw
import os

ROOT=os.path.curdir

w = taskw.TaskWarrior()

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
            # new
            d = {k: v.encode('latin1').decode('utf-8') for k,v in bottle.request.POST.items()}
#            d = bottle.request.POST # faster operations (shouldn't it be valid utf-8 already ??)
            return w.task_add(**d)

@bottle.route('/')
def cb():
    return bottle.static_file('index.html', root=ROOT)

@bottle.route('<pfx:re:.*>/favicon.ico')
def cb(pfx):
    return bottle.static_file('favicon.ico', root=ROOT+'/static/')

@bottle.route('/js/<fname:path>')
def cb(fname):
    return bottle.static_file(fname, root=ROOT+'/static/js/')

@bottle.route('/css/<fname:path>')
def cb(fname):
    return bottle.static_file(fname, root=ROOT+'/static/css/')

if __name__ == "__main__":
    bottle.debug(True)
    bottle.run()
