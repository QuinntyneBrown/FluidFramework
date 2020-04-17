/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ContainerRuntimeFactoryWithDefaultComponent,
    PrimedComponent,
    PrimedComponentFactory,
} from "@microsoft/fluid-aqueduct";
import { IComponentHandle } from "@microsoft/fluid-component-core-interfaces";
import { SharedDirectory } from "@microsoft/fluid-map";
import { HTMLViewAdapter } from "@microsoft/fluid-view-adapters";
import { IComponentHTMLView } from "@microsoft/fluid-view-interfaces";

import {
    Clicker,
    ClickerName,
    ClickerWithInitialValueFactory,
    ClickerWithInitialValueName,
    IClickerInitialState,
} from "./internal-components";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const pkg = require("../package.json");
export const PondName = pkg.name as string;

/**
 * Basic Pond example using stock component classes.
 *
 * Provides:
 *  - Component embedding
 *  - Component creation with initial state
 *  - Component creation and storage using Handles
 */
export class Pond extends PrimedComponent implements IComponentHTMLView {
    private readonly clickerKey = "clicker";
    private readonly clickerWithInitialValueKey = "clicker-with-initial-value";

    public clicker2Render: HTMLViewAdapter | undefined;
    public clicker3Render: HTMLViewAdapter | undefined;

    public get IComponentHTMLView() { return this; }

    /**
   * Do setup work here
   */
    protected async componentInitializingFirstTime() {
        const clickerComponent = await Clicker.getFactory().createComponent(this.context);
        this.root.set(this.clickerKey, clickerComponent.handle);

        const initialState: IClickerInitialState = { initialValue: 100 };
        const clickerWithInitialValueComponent =
            await ClickerWithInitialValueFactory.getFactory().createComponent(this.context, initialState);
        this.root.set(this.clickerWithInitialValueKey, clickerWithInitialValueComponent.handle);
    }

    protected async componentHasInitialized() {
        const clicker2 = await this.root.get<IComponentHandle>(this.clickerKey).get();
        this.clicker2Render = new HTMLViewAdapter(clicker2);

        const clicker3 = await this.root.get<IComponentHandle>(this.clickerWithInitialValueKey).get();
        this.clicker3Render = new HTMLViewAdapter(clicker3);
    }

    // start IComponentHTMLView

    public render(div: HTMLElement) {
        if (!this.clicker2Render || !this.clicker3Render) {
            throw new Error("Pond not initialized correctly");
        }

        // Pond wrapper component setup
        // Set the border to green to denote components boundaries.
        div.style.border = "1px dotted green";
        div.style.padding = "5px";

        const title = document.createElement("h1");
        title.innerText = "Pond";

        const index = document.createElement("h4");
        index.innerText =
      `dotted borders denote different component boundaries`;

        div.appendChild(title);
        div.appendChild(index);

        // Setup a Snapshot button to force snapshot
        const snapshotButton = document.createElement("button");
        snapshotButton.textContent = "Force Snapshot";
        snapshotButton.onclick = () => {
            this.runtime.save("forced snapshot");
        };

        div.appendChild(snapshotButton);

        // Sub-Component setup
        const clicker2Div = document.createElement("div");
        const clicker3Div = document.createElement("div");
        div.appendChild(clicker2Div);
        div.appendChild(clicker3Div);

        this.clicker2Render.render(clicker2Div);
        this.clicker3Render.render(clicker3Div);

        return div;
    }

    // end IComponentHTMLView

    // ----- COMPONENT SETUP STUFF -----

    public static getFactory() { return Pond.factory; }

    private static readonly factory = new PrimedComponentFactory(
        PondName,
        Pond,
        [SharedDirectory.getFactory()],
        new Map([
            [ClickerName, Promise.resolve(Clicker.getFactory())],
            [ClickerWithInitialValueName, Promise.resolve(ClickerWithInitialValueFactory.getFactory())],
        ]),
    );
}

// ----- CONTAINER SETUP STUFF -----

export const fluidExport = new ContainerRuntimeFactoryWithDefaultComponent(
    PondName,
    new Map([
        [PondName, Promise.resolve(Pond.getFactory())],
    ]));