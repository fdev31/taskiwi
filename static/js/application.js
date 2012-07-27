/* TODO:
 *
 * make a function adapting the tasks
 * - dates & co (like in edit mode)
 * - unquot() calls
 * - editable initial state
 */

all_tasks = [];
all_projects = [];
rev_sel = {};

function apply_filter(opts) {
    var opts = opts || {};
    var proj = (opts.proj || '').toLowerCase();
    var descr = (opts.descr || '').toLowerCase();

    if (!!descr) {
        descr = RegExp('.*'+descr+'.*', 'i');
    }
    if (!!!descr && !!!proj) {
        all_tasks.pending.forEach( function(o) { rev_sel[o.uuid].fadeIn(); } );
    } else {
        all_tasks.pending.forEach(
            function(o) {
                var d=rev_sel[o.uuid];
                if ((proj && (o.project || '').toLowerCase() !== proj) || (descr && !!!o.description.match(descr))) {
                    d.hide() ;
                } else {
                    d.show();
                }
            }
        );
    }
};

function duplicate(d) {
    return $.extend({}, d);
};

function edit_task_popup(uuid) {
	var t = duplicate( task_by_uuid(uuid) );
    var annotations = [];
    for (k in t) {
        if (!!k.match(/^annotation_/)) {
            annotations.push(
                    {'id': new Date( eval(k.match(/^annotation_(.*)/)[1]) * 1000).toDateString(),
                        'content': t[k]
                    });
        }
    };
    t.annotations = annotations;
	t.date = new Date(t.entry*1000).toDateString();
    if(t.end)
        t.end_date = new Date(t.end*1000);
    if(t.due)
        t.due_date = new Date(t.due*1000);
	ich.edit_dialog(t).modal();
};

function add_new_task(proj, descr, cb) {
    if(!!!descr)
        return;
    $.post('/tasks', {'project': proj, 'description': descr},
        function(infos) {
            infos.editable = true;
            if (!!proj)
                infos.project = proj;
            var ti = ich.taskitem(infos);
            rev_sel[infos.uuid] = ti;
            ti.appendTo('#pending_tasks');
            ti.hide();
            if ( all_projects.indexOf(proj) === -1 ) {
                all_projects.push(proj);
            }
            all_tasks.pending.push(infos);
            sort_tasks();
            ti.fadeIn(2000);
            if(!!cb) cb();
        });
};

function task_by_uuid(uuid) {
	var found = false;
	all_tasks.pending.forEach( function(o) {
		if (o.uuid == uuid)
			found = o;
	});
	if(!!!found) {
		all_tasks.completed.forEach( function(o) {
		if (o.uuid == uuid)
			found = o;
		});
	}
    return found;
};

function event_task_drop(event, ui) {
	var uuid = ui.item[0].id;
    var target = $(ui.item[0]);
	setTimeout(function(){
		if (event.target.id == "done_tasks") {
//            alert('Marking ' + uuid + ' task done');
            $.post('/tasks', {'action': 'remove', 'uuid': uuid} );
            var t = task_by_uuid(uuid);
            var idx = all_tasks.pending.indexOf(t);
            delete all_tasks.pending[idx];
            t['status'] = 'completed';
            all_tasks.completed.push(t);
		} else {
//            alert('Creating '+uuid+' clone');
            // put the dom item back in the original list
            var tgt = target.detach();
            tgt.appendTo('#done_tasks');
            var t = task_by_uuid(uuid);
            add_new_task(t.project, t.description);
		}
	}, 500);
};

function toggle_done_display() {
    var dt = $('#done_tasks').parent();
    if (dt.is(':visible')) {
        dt.slideUp();
        $('#pending_tasks').parent().removeClass('span7', 500);
    } else {
        dt.slideDown();
        $('#pending_tasks').parent().addClass('span7', 500);
    }
};

_prios = {
    'L': 1,
    'M': 3,
    'H': 5
};

function sort_tasks(opts) {
    var opts = opts || {};
    var groups = opts.save_groups;
    var only_pending = opts.todo_only;

    var sort_by_project = function(a,b) {
        var rp = (_prios[b.priority] || 2) - (_prios[a.priority] || 2) ;
        if(rp !== 0)
            return rp;
        var x = (a.project || '').toUpperCase();
        var y = (b.project || '').toUpperCase();
        if(!!groups)
            if(!only_pending || a.status === 'pending')
                groups[a.project] = true;
        if( x < y) {
            return -1;
        } else if (x === y) {
            if (x.description < y.description) {
                return -1;
            } else if (x.description === y.description) {
                return 0;
            } else {
                return 1;
            }
        } else {
            return 1;
        }
    };
    all_tasks.pending.sort(sort_by_project);
    all_tasks.completed.sort(sort_by_project);

    // don't redraw if initial state
    var pt = $('#pending_tasks');
    if( pt.length != 0) {
        pt.find('li').each( function(i,o) { var o= $(o).detach(); rev_sel[$(o).attr('id')] = o; } );
        all_tasks['pending'].forEach( function(o) {
            rev_sel[o.uuid].appendTo(pt);
        });
    }
};

// INIT

function set_focus() {
    $('#new_task_descr').focus();
};

function rmquot(txt) {
    return txt.replace(/\\"/g, '"');
}

$(function() {
    var _tmp = {};
	$.get('/tasks').success(function(tasks) {
		all_tasks = tasks; // set global
        sort_tasks({'save_groups':_tmp, 'todo_only':true});
        for (k in _tmp) {
            if( !!k ) all_projects.push(k);
        }

        $('#new_task_project').typeahead({'source': all_projects}); // set projects as completable

		$(tasks.pending).each(function(i,t){
            t.editable=true;
            t.description = rmquot(t.description);
        });
		$(tasks.completed).each(function(i,t){
            t.editable=false;
            t.description = rmquot(t.description);
        });
		ich.tasklist(tasks).appendTo('#mainbody');
		$('#pending_tasks, #done_tasks').sortable({
			connectWith: '.connected_tasks',
		   receive: event_task_drop
		});
        $('#pending_tasks li').each( function(i,o) {
            rev_sel[o.id] = $(o);
        });
	});
    set_focus();

// http://stackoverflow.com/questions/925334/how-is-the-default-submit-button-on-an-html-form-determined
 $("form input").keypress(function (e) {
    if ((e.which && e.which == 13) || (e.keyCode && e.keyCode == 13)) {
        $('input[type=submit]:first').click();
        return false;
    } else {
        return true;
    }
    });

});
