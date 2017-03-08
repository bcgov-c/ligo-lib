var left_header = [];
var right_header = [];
var status = 'DRAFT';

$(function () {
    $.ajaxSetup({
        headers: { "X-CSRFToken": Cookies.get('csrftoken') }
    });

    getLeftHeader();
    var total_steps = $("#id_steps-TOTAL_FORMS").val();
    $("#form-steps-container input:checkbox").hide();

    $('.step-seq').each(function(index) {
        $(this).val(index + 1);
    });

});

function getLeftHeader() {
    var leftDataset = $('#id_left_data').find("option:selected").text();
    $('#left-columns-title').text(leftDataset + ' Columns:');
    getHeader(left_data_id, 'left-header', function(header) {
        left_header = header;
    });
}

function getRightHeader() {
    var rightDataset = $('#id_right_data').find("option:selected").text();
    $('#right-columns-title').text(rightDataset + ' Columns:');
    getHeader(right_data_id, 'right-header', function(header) {
        right_header = header;
    });
}

function getHeader(elmnt, class_name, callback) {
    if (typeof elmnt === 'undefined') return;

    var dataset_id = $("#" + elmnt).val();
    var processResponse = function(response_data, textStatus_ignored, jqXHR_ignored)  {
        var header =  response_data.header;
        var options = '<option></option>';
        for (i=0; i < header.length; i++) {
            options += '<option value="' + header[i] + '">' + header[i] + '</option>';
        }

        header_options[elmnt] = options;

        $('.' + class_name).each(function() {
            var selected_val = $(this).val();
            $(this).html(options);
            $(this).val(selected_val);
        });

        return header;
    };
    var data_header_req = {
        url : DATASET_COLUMNS_URL ,
        type : "GET",
        data : {
            id: dataset_id,
        }
    };
    $.ajax(data_header_req).done(
        function(response) {
            var header = processResponse(response);
            if (typeof callback !== 'undefined') {
                callback(header);
            }
        }
    );
};

$("#" + left_data_id).change(function() {
    getLeftHeader();
});


function showSelectedColumns(header, columns, requiredCols) {
    var columnsHtml = '';

    for (var index = 0; index < header.length; index++) {
        var item = header[index];
        var colHtml = '<div class="col-sm-4"><input type="checkbox" value="' + item + '"';
        if (columns && columns.indexOf(item) != -1) {
            colHtml += 'Checked="Checked" ';
        }
        if (requiredCols && requiredCols.indexOf(item) != -1) {
            colHtml += 'disabled="true" ';
        }
        colHtml += '>&nbsp;<span>' + item +'</span></div>';
        columnsHtml += colHtml;
    }

    return columnsHtml;
}


function getVariable(typeSelector, headerSelector, index) {
    var selector = '#' + typeSelector + '-vars-' + index + ' .' + headerSelector;
    var items = [];
    $(selector).not(".deleted").each(function() {
        var selected_val = $(this).val();
        items.push(selected_val);
    });

    return items;
}

function blocking_json(index) {

     schema = {left : [], right: [], transformations: [] };

     schema.left = getVariable('blocking', 'left-header', index);
     schema.right = getVariable('blocking', 'right-header', index);

     if (schema.left.length == 0 || (project_type == 'LINK' && schema.right.length == 0)) {
         status = 'DRAFT';
     }

    var trans_selector = "#blocking-vars-" + index + " .alg";
    $(trans_selector).not(".deleted").each(function() {
        var selected_val = $(this).val();
        schema.transformations.push(selected_val);
    });

    if (schema.transformations.length == 0) {
         status = 'DRAFT';
    }

    return JSON.stringify(schema);

}

function linking_json(index) {


     schema = {left : [], right: [], comparisons: [] };

     schema.left = getVariable('linking', 'left-header', index);
     schema.right = getVariable('linking', 'right-header', index);

     if (schema.left.length == 0 || (project_type == 'LINK' && schema.right.length == 0)) {
         status = 'DRAFT';
     }

     var trans_selector = "#linking-vars-" + index + " .alg";
     $(trans_selector).not(".deleted").each(function() {
        var selected_val = $(this).val();
        var suffix = this.id.slice(9);

        var comparison = {"name": selected_val};
        args_list = COMPARISON_ARGS[selected_val];
        if (args_list) {
            args = {};
            for (index = 0; index < args_list.length; index++) {
                arg = {};
                arg_id = "link_comp_arg" + suffix + "_" + index;
                var arg_val = $("#" + arg_id).val();
                var arg_name = $('label[for="' + arg_id + '"]').html();
                arg_val = (!isNaN(arg_val)) ? parseFloat(arg_val) : arg_val;
                args[arg_name] = arg_val;
            }

            comparison["args"] = args;
        }
        schema.comparisons.push(comparison);
     });

    return JSON.stringify(schema);

}


function getSelectedColumns(selector) {

    columns = [];
    selector.find('input:checkbox').each(function() {
        if ($(this).prop('checked')) {
            columns.push($(this).val());
        }
    });
    return columns;
}

$("#linking-form").submit(function() {
    status = 'READY';
    var count = parseInt($('#id_steps-TOTAL_FORMS').val());
    //Reconstruct blocking and linking schema from the input elements
    for (var index = 0; index <count; index++) {

        var field_select = "#id_steps-" + index + "-blocking_schema";
        $(field_select).val(blocking_json(index));

        field_select = "#id_steps-" + index + "-linking_schema";
        $(field_select).val(linking_json(index));

    }

    leftColumns = getSelectedColumns($('#selected_left_columns'));

    $('#id_left_columns').val(JSON.stringify(leftColumns));
    if (project_type == 'LINK') {
        rightColumns = getSelectedColumns($('#selected_right_columns'));
        $('#id_right_columns').val(JSON.stringify(rightColumns));
    }

    if (!count || count == 0) {
        status = 'DRAFT'
    }

    $('#id_status').val(status);
    return true;
});


$('#form-steps-container').on('click', '.blocking-vars .blocking-var-remove', function() {
    var row = $(this).parent().parent();
    row.find("td select").addClass( "deleted" );
    row.hide();

    return false;
});

$('#form-steps-container').on('click', '.linking-vars .linking-var-remove', function() {
    var row = $(this).parent().parent().parent().parent().parent();
    row.find("select, input").addClass( "deleted" );
    row.hide();

    return false;
});

$("#form-steps-container").on('change', '.link-vars-container .link-var-row .alg', function(){

    var select_id = $(this).attr('id');
    suffix = select_id.slice(9);
    var selected_alg = $(this).val();
    $(this).parent().parent().parent().find('.alg-arg').empty();
    var args_list = comparison_args[selected_alg];
    if (args_list) {
        args_html = '';
        for (index = 0; index < args_list.length; index++) {
            arg_id = 'link_comp_arg' + suffix + '_' + index;
            arg_name = args_list[index];
            args_html += '<label for="' + arg_id + '" class="control-label col-sm-2">' + arg_name + '</label>'
                    + '<div class="preview col-sm-4"><input id="' + arg_id + '" type="text" class="form-control"></div>';
        }
        $(this).parent().parent().parent().find('.alg-arg').append(args_html);
    }

});

$("#form-steps-container").on('click', '.step-delete', function() {

    var form_id = $(this).parent().parent().parent().attr('id');
    var form_index = form_id.slice(10);
    var delete_id = "id_steps-" + form_index + "-DELETE" ;
    $("#" + delete_id).prop('checked', true);
    $("#" + form_id).hide();
    return false;
});

/*
    Based on the stackoverflow solution provided here :
    http://stackoverflow.com/questions/21260987/add-a-dynamic-form-to-a-django-formset-using-javascript-in-a-right-way?answertab=votes#tab-top
 */
$("#step-create").click(function() {

    var count = parseInt($('#id_steps-TOTAL_FORMS').val());
    var tmplMarkup = $('#item-template').html();
    var compiledTmpl = tmplMarkup.replace(/__prefix__/g, count);
    $('div#form-steps-container').append(compiledTmpl);

    $('#id_steps-TOTAL_FORMS').val(count+1);
    $("#id_steps-" + count +"-DELETE").hide();
    $("#id_steps-" + count +"-seq").val(count+1);
    return false
});

$('a[href="#project-results"]').on('click', function() {

    var left_vars = [];
    var right_vars = [];

    var count = parseInt($('#id_steps-TOTAL_FORMS').val());
    for (var index = 0; index <count; index++) {
        left_vars = left_vars.concat(getVariable('blocking', 'left-header', index));
        left_vars = left_vars.concat(getVariable('linking', 'left-header', index));
        right_vars = right_vars.concat(getVariable('blocking', 'right-header', index));
        right_vars = right_vars.concat(getVariable('linking', 'right-header', index));
    }

    for (index in left_vars) {
        if (leftColumns.indexOf(left_vars[index]) == -1) {
            leftColumns.push(left_vars[index]);
        }
    }

    for (index in right_vars) {
        if (rightColumns.indexOf(right_vars[index]) == -1) {
            rightColumns.push(right_vars[index]);
        }
    }

    var columnsHtml = showSelectedColumns(left_header, leftColumns, left_vars.concat(required_left));
    $('#selected_left_columns').html(columnsHtml);

    if (project_type == 'LINK') {
        columnsHtml = showSelectedColumns(right_header, rightColumns, right_vars.concat(required_right));
        $('#selected_right_columns').html(columnsHtml);
    }

});

function updateSelectedColumns(columnSet, selectedElem) {
    var value = selectedElem.val();
    if (selectedElem.prop('checked')) {
        columnSet.push(value);
    }
    else {
        var index = columnSet.indexOf(value);
        if (index > -1) {
            columnSet.splice(index, 1);
        }
    }

}

$('#selected_left_columns').on('click', ' input:checkbox', function() {
    updateSelectedColumns(leftColumns, $(this));
});

$('#selected_right_columns').on('click', ' input:checkbox', function() {
    updateSelectedColumns(rightColumns, $(this));
});
