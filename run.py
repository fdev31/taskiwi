#!/usr/bin/env python

import bottle
import taskw
import os
try:
    from .config import _ConfigObj
except (ValueError, SystemError):
    from config import _ConfigObj

conf = _ConfigObj()

w = taskw.TaskWarrior()

warriors = {}

def getmakeroot(tid):
    if tid not in warriors:
        db = conf['databases']
        rcfile = db+tid+'.rc'
        if not os.path.exists(rcfile):
            try:
                os.mkdir(db+tid)
            except OSError:
                pass
            open(rcfile, 'w').write('data.location='+db+tid+'\n')
            open('%s/%s/completed.data'%(db,tid), 'w').write('')
            open('%s/%s/pending.data'%(db,tid), 'w').write('')
        warriors[tid] = taskw.TaskWarrior(db+tid+'.rc')
    return warriors[tid]


def decode(txt):
    return txt.encode('latin1').decode('utf-8')

@bottle.route('/<tid>/')
def cb(tid):
    return bottle.static_file('index.html', root=conf['root'])

@bottle.route('/<tid>/tasks', method=['GET', 'POST'])
def cb(tid):
    w = getmakeroot(tid)
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

@bottle.route('/<tid>/edit', method='POST')
def cb(tid):
    w = getmakeroot(tid)
    params = bottle.request.POST
    task = {
            'uuid': params.pk,
            params.name: params.value.replace('\n', r'[\n]') if params.name == 'description' else params.value
            }
    i, t = w.task_update(task)
    return t

# get list of task list ;)

@bottle.route('/tasklists')
def cb():
    return {n:n.title() for n in os.listdir(conf['databases'])
        if os.path.exists( os.path.join(conf['databases'], n+'.rc'))}

    return  {'one':'One', 'two': 'Two', 'three': 'Three'}

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
    return bottle.static_file('index.html', root=conf['root'])

@bottle.route('<pfx:re:.*>/favicon.ico')
def cb(pfx):
    return bottle.static_file('favicon.ico', root=conf['root']+'/static/')

@bottle.route('/js/<fname:path>')
def cb(fname):
    return bottle.static_file(fname, root=conf['root']+'/static/js/')

@bottle.route('/img/<fname:path>')
def cb(fname):
    return bottle.static_file(fname, root=conf['root']+'/static/img/')

@bottle.route('/css/<fname:path>')
def cb(fname):
    return bottle.static_file(fname, root=conf['root']+'/static/css/')

if __name__ == "__main__":
    bottle.debug(True)
    bottle.run(host='0.0.0.0', port=8888)

