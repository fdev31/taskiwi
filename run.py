#!/usr/bin/env python

import bottle
import taskw
import os

ROOT=os.path.curdir

w = taskw.TaskWarrior()

@bottle.route('/tasks')
def cb():
    return w.load_tasks()

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
