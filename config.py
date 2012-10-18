try:
    from configparser import ConfigParser
except ImportError: # py2
    from ConfigParser import ConfigParser
from time import time
import os

defaults_dict = {'root':os.path.curdir, 'databases': '/tmp/'}
config_filename = 'taskw.ini'

class _ConfigObj(object):
    """ Configuration object """

    _cfg = ConfigParser(defaults_dict)

    def _refresh(self):
        t = int(time()+0.5)
        if self._lastcheck + 1 < t:
            self._lastcheck = t
            st = os.stat(config_filename)
            st = max(st.st_mtime, st.st_ctime)
            if self._mtime < st:
                self._mtime = st
                self._cfg.read(config_filename)

    def __init__(self):

        self._mtime = 0 # last mtime of the file
        self._lastcheck = 0 # os.stat flood protection

        try:
            self._refresh()
        except OSError:
            self._cfg.write(open(config_filename, 'w'))

    def __setattr__(self, name, val):
        if name in ('_lastcheck', '_mtime'):
            return object.__setattr__(self, name, val)

        self._refresh()

        if val.lower() in ('off', 'no'):
            val = ''

        val = self._cfg.set('DEFAULT', name, val)
        config._cfg.write(open(config_filename, 'w'))
        return val

    def __getattr__(self, name):
        self._refresh()
        v = self._cfg.get('DEFAULT', name)
        return v

    __setitem__ = __setattr__
    __getitem__ = __getattr__

    def __iter__(self):
        for k in defaults_dict:
            yield (k, self[k])

