all_tasks = [];

function edit_task_popup(uuid) {
	var t = task_by_uuid(uuid);
	t.date = new Date(t.entry*1000);
	ich.edit_dialog(t).modal();
};

function add_new_task(proj, descr) {
	// TODO: ajax put new task into server
	// - return the uuid so it's editable
	var ti = ich.taskitem({
		editable: false,
		project: proj,
		description: descr}).appendTo('#pending_tasks').fadeIn(2000);

};

function task_by_uuid(uuid) {
	var found = false;
	all_tasks.pending.forEach( function(o) {
		if (o.uuid == uuid)
			found=o;
	});
	if(!!!found) {
		all_tasks.completed.forEach( function(o) {
		if (o.uuid == uuid)
			found=o;
		});
	}
	if (found)
		return $.extend({}, found);
	return null;
};

function event_task_drop(event, ui) {
	var uuid = ui.item[0].id;
	$(ui.item[0]).find('.btn').fadeOut();
	setTimeout(function(){
		if (event.target.id == "done_tasks") {
			alert('Marking '+uuid+' task done');
		} else {
			alert('Creating '+uuid+' clone');
		}
	}, 500);
};

// INIT

$(function() {
	$.get('/tasks').success(function(tasks) {
		all_tasks = tasks;
		$(tasks.pending).each(function(i,t){t.editable=true;});
		ich.tasklist(tasks).appendTo('#mainbody');
		$('#pending_tasks, #done_tasks').sortable({
			connectWith: '.connected_tasks',
		   receive: event_task_drop
		});
	});
});