import json
from pathlib import Path
from fresfolio.utils import tools

if tools.is_module_installed("omilayers") and tools.is_module_installed("bokeh"):
    from omilayers import Omilayers
    import pandas
    from pandas.api.types import is_string_dtype
    from bokeh.models import ColumnDataSource, Legend
    from bokeh.plotting import figure, show, output_file, save
    from bokeh.models import HoverTool

palette = ["#74aff3", 
           "#edaab4", 
           "#90d1a4", 
           "#e1b0dd", 
           "#a1bb7a", 
           "#5bd1d8",
           "#c3e0a3", 
           "#bcb8ec", 
           "#bbbc81", 
           "#95bbef", 
           "#e9e1ad", 
           "#7cccee", 
           "#e8b594", 
           "#a0ede5", 
           "#c8bd92", 
           "#aac1e4", 
           "#c0f0c8", 
           "#86bcb1", 
           "#9ac2a1", 
           "#85cec7"]


def _get_plot_data(db_full_path:str, layer:str, col_x:str, col_y:str, col_groupby:str, cols_hover:list) -> pandas.DataFrame:
    columns = [col_x, col_y]
    if cols_hover:
        columns.extend(cols_hover)
    if col_groupby:
        columns.append(col_groupby)
    columns = list(set(columns))

    omi = Omilayers(str(db_full_path))
    df = omi.layers[layer][columns]
    return df

def _store_plot_data(plot_data:dict, plot_data_json_output_filename:str):
    with open(plot_data_json_output_filename, 'w') as outf:
        json.dump(plot_data, outf)

def _create_figure_args(df:pandas.DataFrame, plot_data:dict) -> dict:
    figArgs = {
            "width": plot_data['width'],
            "height": plot_data['height']
            }
    if is_string_dtype(df[plot_data['x']]):
        figArgs['x_range'] = list(df[plot_data['x']].unique())
    if is_string_dtype(df[plot_data['y']]):
        figArgs['y_range'] = list(df[plot_data['y']].unique())
    return figArgs

def _scatter_no_groupby(df:pandas.DataFrame, plot_data:dict):
    source = ColumnDataSource(data=df.to_dict(orient='list'))
    plot = figure(**_create_figure_args(df, plot_data))
    plot.scatter(
            x = plot_data['x'], 
            y = plot_data['y'], 
            size = plot_data['size'], 
            fill_color = palette[0],
            fill_alpha = plot_data['opacity'],
            line_alpha = plot_data['opacity'],
            source = source
            )

    plot.xaxis.axis_label = plot_data['x']
    plot.yaxis.axis_label = plot_data['y']
    
    if plot_data['hover']:
        hovertool = HoverTool(tooltips=[(col, f'@{col}') for col in plot_data['hover']])
        plot.add_tools(hovertool)
    return plot

def _scatter_with_groupby(df:pandas.DataFrame, plot_data:dict):
    col_groupby = plot_data['groupby']
    groups = df[col_groupby].unique()

    plot = figure(**_create_figure_args(df, plot_data))
    legend_items = []
    for group,groupColor in zip(groups, palette[:len(groups)]):
        dfsub = df.query(f"{col_groupby} == '{group}'")
        source = ColumnDataSource(data=dfsub.to_dict(orient='list'))
        renderer = plot.scatter(
                                x = plot_data['x'], 
                                y = plot_data['y'], 
                                size = plot_data['size'], 
                                fill_color = groupColor,
                                fill_alpha = plot_data['opacity'],
                                line_alpha = plot_data['opacity'],
                                source = source
                                )
        legend_items.append((group, [renderer]))
    legend = Legend(items=legend_items, location=(10, 0))
    legend.click_policy="hide"
    plot.add_layout(legend, 'right')

    plot.xaxis.axis_label = plot_data['x']
    plot.yaxis.axis_label = plot_data['y']
    
    if plot_data['hover']:
        hovertool = HoverTool(tooltips=[(col, f'@{col}') for col in plot_data['hover']])
        plot.add_tools(hovertool)
    return plot

def scatter(plot_data:dict) -> None:
    project_dir, project_db = tools.get_paths_for_project_dir_and_db(plot_data['projectID'])
    db_full_path = str(Path(project_dir).joinpath(plot_data['file']))

    df = _get_plot_data(
            db_full_path,
            plot_data['layer'],
            plot_data['x'],
            plot_data['y'],
            plot_data['groupby'],
            plot_data['hover']
            )

    if not plot_data['groupby']:
        plot = _scatter_no_groupby(df, plot_data)
    else:
        plot = _scatter_with_groupby(df, plot_data)

    output_file(str(Path(project_dir).joinpath(plot_data['savePlotPath'])), title='omiplot', mode='cdn')
    save(plot)
    _store_plot_data(plot_data, plot_data['plot_data_json_output_filename'])


def _line_no_groupby(df:pandas.DataFrame, plot_data:dict):
    source = ColumnDataSource(data=df.to_dict(orient='list'))
    plot = figure(**_create_figure_args(df, plot_data))

    plot.line(
            x = plot_data['x'],
            y = plot_data['y'],
            color=palette[0],
            line_width=2,
            source = source
            )

    plot.scatter(
            x = plot_data['x'], 
            y = plot_data['y'], 
            size = plot_data['size'], 
            fill_color = palette[0],
            fill_alpha = plot_data['opacity'],
            line_alpha = plot_data['opacity'],
            source = source
            )

    plot.xaxis.axis_label = plot_data['x']
    plot.yaxis.axis_label = plot_data['y']
    
    if plot_data['hover']:
        hovertool = HoverTool(tooltips=[(col, f'@{col}') for col in plot_data['hover']])
        plot.add_tools(hovertool)
    return plot

def _line_with_groupby(df:pandas.DataFrame, plot_data:dict):
    col_groupby = plot_data['groupby']
    groups = df[col_groupby].unique()

    plot = figure(**_create_figure_args(df, plot_data))
    legend_items = []
    for group,groupColor in zip(groups, palette[:len(groups)]):
        dfsub = df.query(f"{col_groupby} == '{group}'")
        source = ColumnDataSource(data=dfsub.to_dict(orient='list'))

        renderer1 = plot.line(
                              x = plot_data['x'],
                              y = plot_data['y'],
                              color=groupColor,
                              line_width=2,
                              source = source
                              )


        renderer2 = plot.scatter(
                                x = plot_data['x'], 
                                y = plot_data['y'], 
                                size = plot_data['size'], 
                                fill_color = groupColor,
                                fill_alpha = plot_data['opacity'],
                                line_alpha = plot_data['opacity'],
                                source = source
                                )

        legend_items.append((group, [renderer1, renderer2]))
    legend = Legend(items=legend_items, location=(10, 0))
    legend.click_policy="hide"
    plot.add_layout(legend, 'right')

    plot.xaxis.axis_label = plot_data['x']
    plot.yaxis.axis_label = plot_data['y']
    
    if plot_data['hover']:
        hovertool = HoverTool(tooltips=[(col, f'@{col}') for col in plot_data['hover']])
        plot.add_tools(hovertool)
    return plot

def line(plot_data:dict) -> None:
    project_dir, project_db = tools.get_paths_for_project_dir_and_db(plot_data['projectID'])
    db_full_path = str(Path(project_dir).joinpath(plot_data['file']))

    df = _get_plot_data(
            db_full_path,
            plot_data['layer'],
            plot_data['x'],
            plot_data['y'],
            plot_data['groupby'],
            plot_data['hover']
            )

    df = df.sort_values(by=plot_data['x'])

    if not plot_data['groupby']:
        plot = _line_no_groupby(df, plot_data)
    else:
        plot = _line_with_groupby(df, plot_data)

    output_file(str(Path(project_dir).joinpath(plot_data['savePlotPath'])), title='omiplot', mode='cdn')
    save(plot)
    _store_plot_data(plot_data, plot_data['plot_data_json_output_filename'])

