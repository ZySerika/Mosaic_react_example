import React, { useEffect, useRef } from 'react';
import { Selection, coordinator, wasmConnector } from '@uwdata/mosaic-core';
import { loadCSV } from '@uwdata/mosaic-sql';
import * as vg from '@uwdata/vgplot';
import embed from 'vega-embed';
import { FilteredVegaClient, SelectionVegaClient, spec } from './vega.js';

const VegaReactComponent = () => {
  const plotsRef = useRef(null); 

  useEffect(() => {
    async function init() {
      const vegaPlot = document.createElement('div');
      const result = await embed(vegaPlot, spec, { actions: false });

      const wasm = await wasmConnector({ log: false });
      coordinator().databaseConnector(wasm);

      await coordinator().exec(
        loadCSV("weather", `${window.location}seattle-weather.csv`)
      );
      
      // Selection scheme
      const selection = Selection.intersect();
      
      const client1 = new SelectionVegaClient({
        view: result.view,
        table: "weather",
        dataset: "table",
        selection: selection,
      });
      coordinator().connect(client1);

      const client2 = new FilteredVegaClient({
        view: result.view,
        table: "weather",
        dataset: "filteredTable",
        filter: selection,
      });
      coordinator().connect(client2);

      if (plotsRef.current) {
        plotsRef.current.replaceChildren(
          vg.vconcat(
            vg.hconcat(
              vg.hspace('2em'),
              vg.menu({ from: "weather", column: "weather", label: "Weather", as: selection })
            ),
            vg.vspace(4),
            vg.hconcat(
              vegaPlot,
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
        );
      }
    }

    init();
  }, []);

  return <div ref={plotsRef} id="plots"></div>; // This div is replaced by the plots through plotsRef communication
};

export default VegaReactComponent;
