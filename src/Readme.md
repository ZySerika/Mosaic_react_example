# Building a React app using Mosaic

In this tutorial, we will build a simple React app that makes use of the Mosaic core functionalities as well as  packages including mosaic-vgplot and mosaic-sql. We also demonstrate building a custom Mosaic Client that updates corresponding React components.
This tutorial is based on the [Vega Example](https://github.com/uwdata/mosaic/tree/main/packages/vega-example) but with some non-trivial modifications. 

## Getting Started
In the target directory run (with yarn or npx)
```shell
yarn create react-app mosaic-weather-app
cd mosaic-weather-app
```

Install dependencies (mosaic-core and mosaic-sql are included in vgplot package).
```shell
npm i @uwdata/vgplot
```

To clean the template, replace the default to the following, with a placeholder header:

```js
import './App.css';
import WeatherViz from './weatherwiz';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Weather Data Visualization</h1>
      </header>
      <main>
        <WeatherViz />
      </main>
    </div>
  );
}
export default App;
```

We also need to download the data (csv) file we want to interact with. Head to [this page](https://github.com/uwdata/mosaic/blob/main/packages/vega-example/public/seattle-weather.csv) and download it into the public folder of our project. 

Now create a new file in the current directory (or inside a new "components" folder) named 'weatherwiz.jsx', and write an empty component with React imports we will make use of.

```js

import React, { useEffect, useRef, useState } from 'react';

const WeatherViz = () => {};

export default WeatherViz;
```

Now we are ready to integrate Mosaic packages into our project.

## Setting up Mosaic

Since Mosaic uses asynchronous setup, it is best to handle the following logic inside an async helper clause that is called upon initial rendering via useEffect.
Inside WeatherViz, make the following structure:
```js

const fetchData = async (props) => {
  return null;
};

const PlotWeatherData = (props) => {
  useEffect(() => {
    // Async setup
    fetchData(props);
  }, []);

  return (
    <div>Hello World!</div>
  )
};

const WeatherViz = () => {
  return(
    <div>PlotWeatherData </div>
  )
}
```
Note the empty array argument which tells useEffect to execute only once upon initialization.

We will import the following from mosaic-core:
```js
import { Selection, coordinator, wasmConnector } from '@uwdata/mosaic-core';
```

The first thing we will need is a **connector** and a coordinator that connects to it and populate it. In this project we will make use of the wasmConnector. For more information or alternatives visit [this page](https://uwdata.github.io/mosaic/api/core/connectors.html).

Inside the fetchData function, write the following:
```js
const wasm = await wasmConnector({ log: false });
coordinator().databaseConnector(wasm);

await coordinator().exec(
  loadCSV("weather", `${window.location}seattle-weather.csv`)
);
```
Which sets up the connector and loads the data from csv file into DuckDB database.

But how do we make any visualizations from this asynchronous setup? In order to render our plots after this setup stage, we need a handle that allows us to write our plot into the DOM when we can. This is a typical usage of the **useRef** function:
```js
const plotsRef = useRef(null); 

useEffect(() => {
  fetchData(props).then((vgspec) => {
    if (plotsRef.current) {
      plotsRef.current.replaceChildren(vgspec);
    }
  });
}, []);

return(
  <div ref={plotsRef} id="plots"></div>
);
```

Since we rely on vgplot semantics to structure our visualization, import the following:
```js
import * as vg from '@uwdata/vgplot';
```

At this point, we have done setting up a basic structure to write our Mosaic visualization.

## Mosaic Visualization

Mosaic visualization can be done in several ways such as using mosaic-inputs, mosaic-vgplot, or through custom defined clients. This project will explore them in a combination.

All three forms mentioned above consist of defining a Mosaic Client. Mosaic Input widgets and Vgplot (through [Marks](https://uwdata.github.io/mosaic/api/vgplot/marks.html)) already define them implicitly. 
Clients are used to publish data needs and update received data. In addition, the Selection semantic is used to facilitate and integrate interactive queries. Read more about Clients [here](https://uwdata.github.io/mosaic/api/core/client.html) and Selections [here](https://uwdata.github.io/mosaic/api/core/selection.html).

Inside init(), begin by defining a selection in that our clients will make use of to communicate interactive data queries with each other:
```js
await coordinator().exec(
  loadCSV("weather", `${window.location}seattle-weather.csv`)
); // prev line
const selection = Selection.intersect();
```
*Intersect* indicates that this selection will resolve queries through the intersection operation (becomes "stricter" with each selection clause).

### Mosaic inputs

The simplest way to make specific queries about your data are using inputs. Here, we will use a simple [**menu**](https://uwdata.github.io/mosaic/api/inputs/menu.html)widget that queries a specific column and offers the user a drop-down list to categorically select from.
```js
vg.vconcat(
  vg.hconcat(
    vg.hspace('2em'),
    vg.menu({from: "weather", column: "weather", label: "Weather", as: selection})
  ),
  vg.vspace(4),
  // placeholder for other plots
)
```
Here we have embedded our menu inside our vgplot structure. Vgplot uses a declarative language, so it is easy to use and read. [Here](https://uwdata.github.io/mosaic/api/vgplot/layout.html) is a quick explanation of layout helpers.

Note that we specify the menu to use our previously defined 'selection' by passing it into the 'as' option.

At this point, we should see a rendering of our interactive menu in the webpage, although it doesn't really do anything since we haven't put any graphs on it.
For the rest of the inputs, see [here](https://uwdata.github.io/mosaic/api/inputs/menu.html) for a list of inputs widgets.

### Mosaic vgplot graphs

Now is time to create our graph. We will begin with a simple dotted graph that displays max temperature on horizontal axis and wind level on the vertical axis.
Update our vgplot to include:
```js
vg.vconcat(
  vg.hconcat(
    vg.hspace('2em'),
    vg.menu({from: "weather", column: "weather", label: "Weather", as: selection})
  ),
  vg.vspace(4),
  vg.hconcat(
    vg.hspace('1em'),
    vg.plot(
      vg.dot(
        vg.from("weather", { filterBy: selection }),
        { x: "temp_max", y: "wind", fill: "steelblue", fillOpacity: 0.3, r: 2 }
      ),
      vg.intervalX({ as: selection }),
      vg.xyDomain(vg.Fixed),
      vg.width(350),
      vg.height(240)
    )
  )
)
```
Some explanations for this plot: vg.dot uses the dotted plot. the argument `vg.from("weather", { filterBy: selection })` tells it to read data from our weather database, but only taking the portions that are filtered by our selection clause. 

To incorporate interactivity, use `vg.intervalX({as: selection})` which gives the linear x-axis an interactive selection range that we can interact with to apply filters, similar to how we interacted with our menu This is called an [**Interactor**](https://uwdata.github.io/mosaic/api/vgplot/interactors.html). 
Think of the "filterBy" clause as the receiving end, and the Interactor clause as the issuing end.

At this point, you can select items from the menu to contribute to our Selection query, and it will be reflected in the dotted graph. Now we want another graph to see how the graphs interact with each other.

Create a rectY graph (resembling a histogram) that displays the number of entries corresponding to per month in the year. This is slightly harder to implement, because we do not have an implicit data column that displays numerical months. One thing we could do is to use the [dateMonth](https://uwdata.github.io/mosaic/api/sql/date-functions.html) built-in function to process the column, but that would leave us with ordinal values which is hard to issue draggable queries to (for this, see the [bar](https://uwdata.github.io/mosaic/api/vgplot/marks.html#bar) plot).

For demonstration purposes, we would like to manually issue an SQL clause on data initialization that appends a new column into our database based off our date column.
After the `coordinator().exec()` line, write one of the following clauses to either add a new database or change the existing one.
```js
await coordinator().exec(
  `CREATE TABLE IF NOT EXISTS weather AS
    SELECT *, MONTH("date") AS month
    FROM weathercsv;`
);

// ALTERNATIVE: change the database directly
await coordinator().exec(
  `ALTER TABLE weather ADD COLUMN month INT;
    UPDATE weather SET month = MONTH("date");`,
);

```
This simply appends a new column that extracts dates into numerical month values using SQL builtin.

We may now add our plot:
```js

const vgspec = vg.vconcat(
vg.hconcat(
  vg.hspace('2em'),
  vg.menu({ from: "weather", column: "weather", label: "Weather", as: selection })
),
vg.vspace(4),
vg.hconcat(
  // New plot begin
  vg.plot(
    vg.rectY(
      vg.from("weather", { filterBy: selection }),
      { x: vg.bin("month"), y: vg.count(), fill: "steelblue", inset: 0.5}
    ),
    vg.intervalX({ as: selection }),
    vg.xyDomain(vg.Fixed),
    vg.xTicks(12),
    vg.width(350),
    vg.height(240)
  ),
  // New plot end
  vg.hspace('1em'),
  vg.plot(
    vg.dot(
      vg.from("weather", { filterBy: selection }),
      { x: "temp_max", y: "wind", fill: "steelblue", fillOpacity: 0.3, r: 2 }
    ),
    vg.intervalX({ as: selection }),
    vg.xyDomain(vg.Fixed),
    vg.width(350),
    vg.height(240)
  )
)
)
```
We use the built-in aggregation `vg.count` as our vertical axis. For other aggreagation functions see [here](https://uwdata.github.io/mosaic/api/sql/aggregate-functions.html).

At this point, you should be able to build a side-by-side visualization that filters on each other using only vgplot. 

Finally, we consider building a custom-defined mosaic client that is more flexible based on our data needs.

### Custom Mosaic Client

We want to display a simple numerical value on our webpage that displays the average amount of precipitation across our filtered selection. 

We would need the following imports to build our Client:
```js
import { Query, mean } from '@uwdata/mosaic-sql';
import { MosaicClient } from '@uwdata/mosaic-core';
```

Now, define a new class that extends the MosaicClient:
```js
class CountClient extends MosaicClient {
  constructor(opts) {
    const { table, setprec, filter } = opts;
    super(filter);
    this.table = table;
    this.setter = setprec;
  }
}
```
Here we define some arguments for our class. All we need is the selection we want to listen to (handled by the parent constructor), the table that represents our loaded database, and an external setter that communicates with React--more on that later.

A basic Mosaic Client typically does two things: telling the coordinator what data it needs, and receiving the said data and do something with it.

The former is done with the builtin query() function:
```js
query(filter = []) {
  return Query.select({ precipitation: mean("precipitation") })
    .from(this.table)
    .where(filter);
}
```
The way to do this is by issuing a **Query**. Although it is possible to do it via string coercion, it is more convenient using the Mosaic query builder. For more information, see [here](https://uwdata.github.io/mosaic/api/sql/queries.html).
Here the filter is simply our selection field, and we want to calculate the mean of the precipitation column we are concerned with. 

After we query for our data, what do we do when we receive it? We use the builtin queryResult(data) function:
```js
queryResult(data) {
  this.setter(data.getChild("precipitation").get(0));
  return this;
}
```
This method is called by the coordinator, meaning that it feeds our data through the argument "data". By default the data is an Apache Arrow Table object. There are various ways to parse it. For official js documentation, see [here](https://arrow.apache.org/docs/js/).

In this tutorial, we use the most straightforward way to take the value. Note that we rely on the fact that only one entry will be returned.

Now, what is our setter? It is something we want to call and communicate with an external visualization. This is precisely the **setState** function in React that allows us to set a value and re-render the component. 
Define the state at start of WeatherViz component:
```js
const [prec, setprec] = useState(null);
```
Our goal is to make a simple modular UI component PrecipitationDisplay that exists alongside PlotWeatherData. We need to pass the state information to both of them from our WeatherWiz wrapper. Now is also a good time to create the PrecipitationDisplay component.
```js
const PrecipitationDisplay = ({ prec }) => {
  return null
};

const WeatherViz = () => {
  const [prec, setprec] = useState(null);

  return (
    <div>
      <PlotWeatherData setprec={setprec} /> 
      <PrecipitationDisplay prec={prec} />
    </div>
  );
}
```
Now we can create our Client Class and pass the setprec handle into it (don't forget to connect it to coordinator):
```js
const selection = Selection.intersect(); //prevline
const statsClient = new CountClient({
  setprec: props.setprec,
  table: "weather",
  filter: selection,
});
coordinator().connect(statsClient);
```

We can now render our *prec* state into our visualization:
```js
const precipitationStyle = {
  border: '1px solid #ccc', // a light grey border
  padding: '10px',
  margin: '10px 0',
  textAlign: 'center', // center the text horizontally
  backgroundColor: '#f9f9f9', // a light background color
  borderRadius: '4px', // slightly rounded corners
  // You can add more styles to match your visualization style
};
return (
  <div style={precipitationStyle}>Average Precipitation: {prec ? prec.toFixed(2) : 'None'}</div>
);
```
We check for prec's null-ness, and render it if it has value. Now, enter the webpage--we should see a clean custom component that displays our average precipitation. Well done!
