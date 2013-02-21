/* TODO:
 *
 * make a function adapting the tasks
 * - dates & co (like in edit mode)
 * - unquot() calls
 * - editable initial state
 *
 */

all_tasks = [];
all_projects = [];

function apply_filter(opts) {
    var opts = opts || {};
    var proj = (opts.proj || '').toLowerCase();
    var descr = (opts.descr || '').toLowerCase();
    var done_delay = 50; // ms

    if (!!descr) {
        descr = RegExp('.*'+descr+'.*', 'i');
    }
    if (!!!descr && !!!proj) {
        var fade_all_in = function(o) { task_by_uuid(o.uuid).widget.fadeIn(); };
        all_tasks.pending.forEach( fade_all_in );
        setTimeout( function() { all_tasks.completed.forEach(fade_all_in) }, done_delay);
    } else {
        var exec_filter = function(o) {
            var d = task_by_uuid(o.uuid).widget;
            console.log(d);
            if ((proj && (o.project || '').toLowerCase() !== proj) || (descr && !!!o.description.match(descr))) {
                d.hide() ;
            } else {
                d.show();
            }
        }
        all_tasks.pending.forEach( exec_filter );
        setTimeout( function() { all_tasks.completed.forEach(exec_filter) }, done_delay);
    }
};

function duplicate(d) {
    return $.extend({}, d);
};

function update_item(data) {
    var t = task_by_uuid(data.uuid);
    for (k in data) {
        t[k] = data[k];
    }
    prepare(t);
    var o = render('taskitem', t);
    t.widget.replaceWith(o);
    t.widget = o;
};

function ts() {
    return new Date().getTime()/1000;
};

function start_task(uuid) {
    var t = task_by_uuid(uuid);
    var icon = t.widget.find('i.start_stop');
    var val;
    if (!!t.start) { // already started
        val = '';
    } else {
        val = ts();
    }
    $.post('./edit', {'pk': uuid, 'name': 'start', 'value': val})
        .success( update_item );
};

function edit_task_popup(uuid) {
	var t = duplicate( task_by_uuid(uuid) );
	var e = ich.edit_dialog(t);
	inject_hooks(e);
    e.modal();
};

function format_date(timestamp) {
	var r = moment(new Date(timestamp)).format("DD/M/YYYY");
	return r;
};

function prepare(item) {
    item.editable = true;
    item.description = rmquot(item.description);
    var annotations = [];
    for (k in item) {
        if (!!k.match(/^annotation_/)) {
		    annotations.push(
	            {'id': format_date(eval(k.match(/^annotation_(.*)/)[1]) * 1000),
	                'content': item[k]
	            });
        }
    };
    item.annotations = annotations;

	// creation date
	if(item.entry)
		item.date = function() {
			return format_date(item.entry*1000);
		};
	if (item.due)
    	item.due_date = function() {
			return format_date(item.due*1000);
		};
	if(item.start)
		item.start_date = function() {
			return format_date(item.start*1000);
		};
	if(item.end)
		item.end_date = function() {
			return format_date(item.end*1000);
		};
};

function add_new_task(proj, descr, cb) {
    if(!!!descr)
        return;
    $.post('tasks', {'project': proj, 'description': descr},
        function(infos) {
            infos.editable = true;
            if (!!proj)
                infos.project = proj;
            var ti = ich.taskitem(infos);
            prepare(infos);
            infos.widget = ti;
            ti.appendTo('#pending_tasks');
            ti.hide();
            if ( all_projects.indexOf(proj) === -1 ) {
                all_projects.push(proj);
            }
            all_tasks.pending.push(infos);
            sort_tasks();
            inject_hooks(ti);
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
            target.removeClass('task_pending');
            target.addClass('task_completed');
//            alert('Marking ' + uuid + ' task done');
            $.post('tasks', {'action': 'remove', 'uuid': uuid} );
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

    var sort_by_project = function(a, b) {
        if (!!a.start && !!b.start) {
            return a.start - b.start;
        } else if (!!a.start && !!!b.start) {
            return -1;
        } else if(!!!a.start && !!b.start) {
            return 1;
        }
        var rp = (_prios[b.priority] || 2) - (_prios[a.priority] || 2) ;
        if(rp !== 0)
            return rp;

        var x = (a.project || '').toUpperCase();
        var y = (b.project || '').toUpperCase();
        if(!!groups) {
            if(!only_pending || a.status === 'pending')
                groups[a.project] = true;
            if(!only_pending || b.status === 'pending')
                groups[b.project] = true;
        }
        if(x < y) {
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
};

// INIT

function set_focus() {
    $('#new_task_descr').focus();
};

function rmquot(txt) {
    return txt.replace(/\\"/g, '"').replace(/\[\\n\]/g, '<br/>');
};

function render(tpl_name, opts) {
	var tpl = ich[tpl_name](opts);
	inject_hooks(tpl);
	return tpl;
};

function reset_main_display() {
    $('#new_task_project').val('');
    $('#new_task_descr').val('');
    apply_filter();
    set_focus();
    return false;
}

function inject_hooks(dom_elt) {
	console.log('infecting', dom_elt);
	dom_elt.find('.auto_editable').editable();

    // FIXME: a little too agressive:
    dom_elt.find("form input").keypress(function (e) {
        var t = e.target;
        var ctrl_k = e.ctrlKey;
        var shift_k = e.shiftKey;
        var main_inp = (t.id === "new_task_descr" || t.id === "new_task_project");
        var val_k = (e.which && (e.which == 13 || e.which == 10)) || (e.keyCode && (e.keyCode == 13 || e.keyCode == 10));

        if (main_inp && val_k && ctrl_k) {
            $('#filter_action').click();
            return false;
        } else if(val_k && shift_k) {
            if(main_inp) {
                reset_main_display();
            } else {
                $(t).val('');
            }
            return false;
        } else if(val_k) {
            $('button[type=submit]:first').click();
            return false;
        }
        return true;
    });
};

function load_tasks() {
    var _tmp = {};
    $('#mainbody').html('');
	$.get('tasks').success(function(tasks) {
		all_tasks = tasks; // set global
        sort_tasks({'save_groups':_tmp, 'todo_only':true});
        for (k in _tmp) {
            if( !!k ) all_projects.push(k);
        }

        $('#new_task_project').typeahead({'source': all_projects}); // set projects as completable

		$(tasks.pending).each(function(i,t){
			prepare(t);
        });
		$(tasks.completed).each(function(i,t){
			prepare(t);
        });
        render('tasklist', tasks)
			.appendTo('#mainbody');
		$('#pending_tasks, #done_tasks').sortable({
			connectWith: '.connected_tasks',
		   receive: event_task_drop
		});
        $('li.task').each( function(i,o) {
            task_by_uuid(o.id).widget = $(o);
        });
	});
    // bind automatic URL edition
    $.fn.editable.defaults.url = 'edit';
    $.fn.editable.defaults.success = update_item;
    set_focus();
};

function select_project(opts) {
	
	window.location.href = "/"+opts.value+"/#";
	/*
	$('.modal').modal('hide');
	$('.auto_editable').editable('hide');
	$('.form-search input').attr('disabled', false);
	$('.form-search button').attr('disabled', false);
	*/
};

$(function() {
	if (window.location.href.match(RegExp('.*/#$'))) {
        /* show tasks */
		load_tasks();
		$('#mainbody').show();
        $('body').keydown( function(e) {
            if(!!e.altKey) {
               if(e.which === 74) {
                    set_focus();
                } else if (e.which === 80) {
                    $('#new_task_project').focus();
                }
            }
        });
	} else {
        /* show tasks-list */
		$('.form-search input').attr('disabled', true);
		$('.form-search button').attr('disabled', true)
		$('#mainbody').show();
	}
	inject_hooks($('body'));
});
