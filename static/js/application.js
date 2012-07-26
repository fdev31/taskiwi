all_tasks = [];
all_projects = [];
rev_sel = {};

function duplicate(d) {
    return $.extend({}, d);
};

function edit_task_popup(uuid) {
	var t = duplicate( task_by_uuid(uuid) );
	t.date = new Date(t.entry*1000);
	ich.edit_dialog(t).modal();
};

function add_new_task(proj, descr, cb) {
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
	$(ui.item[0]).find('.btn').remove();
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

function sort_tasks(projs) {
    var sort_by_project = function(a,b) {
        var x = (a.project || '').toUpperCase();
        var y = (b.project || '').toUpperCase();
        if(!!projs)
            projs[x] = true;
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
    if( pt.length == 0)
        return;

    pt.find('li').each( function(i,o) { var o= $(o).detach(); rev_sel[$(o).attr('id')] = o; } );
    all_tasks['pending'].forEach( function(o) {
        rev_sel[o.uuid].appendTo(pt);
    });


};

// INIT

function set_focus() {
    $('#new_task_descr').focus();
};

$(function() {
    var _tmp = {};
	$.get('/tasks').success(function(tasks) {
		all_tasks = tasks; // set global
        sort_tasks(_tmp);
        for (k in _tmp) {
            if( !!k ) all_projects.push(k.toLowerCase());
        }

        $('#new_task_project').typeahead({'source': all_projects}); // set projects as completable

		$(tasks.pending).each(function(i,t){t.editable=true;});
		ich.tasklist(tasks).appendTo('#mainbody');
		$('#pending_tasks, #done_tasks').sortable({
			connectWith: '.connected_tasks',
		   receive: event_task_drop
		});
	});
    set_focus();
});
