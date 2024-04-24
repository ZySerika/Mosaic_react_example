import React, { useEffect, useRef, useState } from 'react';
import { Selection, coordinator, wasmConnector } from '@uwdata/mosaic-core';
import { Query, dateMonth, isBetween, literal, mean } from '@uwdata/mosaic-sql';
import { MosaicClient } from '@uwdata/mosaic-core';
import { loadCSV } from '@uwdata/mosaic-sql';
import * as vg from '@uwdata/vgplot';




class CountClient extends MosaicClient {
  constructor(opts) {
    const { table, setprec, filter } = opts;
    super(filter);
    this.table = table;
    this.setter = setprec;
  }
  query(filter = []) {
    return Query.select({ precipitation: mean("precipitation") })
      .from(this.table)
      .where(filter);
  }

  queryResult(data) {
    this.setter(data.getChild("precipitation").get(0));
    return this;
  }
}

const PrecipitationDisplay = ({ prec }) => {
  const precipitationStyle = {
    border: '1px solid #ccc',
    padding: '10px',
    margin: '10px 0',
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
  };

  return (
    <div style={precipitationStyle}>Average Precipitation: {prec ? prec.toFixed(2) : 'None'}</div>
  );
};

const fetchData = async (props) => {
  const wasm = await wasmConnector({ log: false });
  coordinator().databaseConnector(wasm);

  await coordinator().exec(
    loadCSV("weathercsv", `${window.location}seattle-weather.csv`)
  );

  await coordinator().exec(
    `CREATE TABLE IF NOT EXISTS weather AS
      SELECT *, MONTH("date") AS month
      FROM weathercsv;`
  );

  // Selection scheme
  const selection = Selection.intersect();

  // Define custom client here
  const statsClient = new CountClient({
    setprec: props.setprec,
    table: "weather",
    filter: selection,
  });

  coordinator().connect(statsClient);

  const vgspec = vg.vconcat(
    vg.hconcat(
      vg.hspace('2em'),
      vg.menu({ from: "weather", column: "weather", label: "Weather", as: selection })
    ),
    vg.vspace(4),
    vg.hconcat(
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

  return vgspec;

};


const PlotWeatherData = (props) => {
  const plotsRef = useRef(null); 
  useEffect(() => {

    fetchData(props).then((vgspec) => {
      if (plotsRef.current) {
        plotsRef.current.replaceChildren(vgspec);
      }
    });
  }, []);

  return (
    <div ref={plotsRef} id="plots"></div>
  )
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


/*
const WeatherViz = () => {
  const plotsRef = useRef(null); 
  const [prec, setprec] = useState(null);


  useEffect(() => {
    async function init() {
      const wasm = await wasmConnector({ log: false });
      coordinator().databaseConnector(wasm);

      await coordinator().exec(
        loadCSV("weathercsv", `${window.location}seattle-weather.csv`)
      );

      await coordinator().exec(
        `CREATE TABLE weather AS
         SELECT *, MONTH("date") AS month
         FROM weather;`
      );
      
      // Selection scheme
      const selection = Selection.intersect();
      
      // Define custom client here
      const statsClient = new CountClient({
        setprec: setprec,
        table: "weather",
        filter: selection,
      });
      coordinator().connect(statsClient);

      const vgspec = vg.vconcat(
        vg.hconcat(
          vg.hspace('2em'),
          vg.menu({ from: "weather", column: "weather", label: "Weather", as: selection })
        ),
        vg.vspace(4),
        vg.hconcat(
          vg.plot(
            vg.rectY(
              vg.from("weather", { filterBy: selection }),
              { x: vg.bin("month"), y: vg.count(), fill: "steelblue", inset: 0.5}
            ),
            vg.intervalX({ as: selection }),
            vg.xyDomain(vg.Fixed),
            vg.width(350),
            vg.height(240)
          ),
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

      if (plotsRef.current) {
        plotsRef.current.replaceChildren(vgspec);
      }
    }

    init();
  }, []);

  return (
    <div>
    <div ref={plotsRef} id="plots"></div>
    <div style={precipitationStyle}>Average Precipitation: {prec ? prec.toFixed(2) : 'None'}</div>
    </div>
  ); // This div is replaced by the plots through plotsRef communication
};
*/



export default WeatherViz;
