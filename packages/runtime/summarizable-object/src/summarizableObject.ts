/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { fromBase64ToUtf8 } from "@microsoft/fluid-common-utils";
import {
    FileMode,
    ISequencedDocumentMessage,
    ITree,
    TreeEntry,
} from "@microsoft/fluid-protocol-definitions";
import {
    IChannelAttributes,
    IComponentRuntime,
    IObjectStorageService,
    Jsonable,
} from "@microsoft/fluid-runtime-definitions";
import {
    ISharedObjectFactory,
    SharedObject,
} from "@microsoft/fluid-shared-object-base";
import { ISummarizableObject } from "./interfaces";
import { SummarizableObjectFactory } from "./summarizableObjectFactory";

const snapshotFileName = "header";

/**
 * Defines the in-memory object structure to be used for the conversion to/from serialized.
 * Directly used in JSON.stringify, direct result from JSON.parse.
 */
interface ISummarizableObjectDataSerializable {
    [key: string]: Jsonable;
}

/**
 * Implementation of a summarizable object. It does not generate any ops. It is only part of the summary.
 * Data should be set in this object in response to a remote op.
 */
export class SummarizableObject extends SharedObject implements ISummarizableObject {
    /**
     * Create a new summarizable object
     *
     * @param runtime - component runtime the new summarizable object belongs to.
     * @param id - optional name of the summarizable object.
     * @returns newly create summarizable object (but not attached yet).
     */
    public static create(runtime: IComponentRuntime, id?: string) {
        return runtime.createChannel(id, SummarizableObjectFactory.Type) as SummarizableObject;
    }

    /**
     * Get a factory for SummarizableObject to register with the component.
     *
     * @returns a factory that creates and loads SummarizableObject.
     */
    public static getFactory(): ISharedObjectFactory {
        return new SummarizableObjectFactory();
    }

    /**
     * The data held by this object.
     */
    private readonly data = new Map<string, Jsonable>();

    /**
     * Constructs a new SummarizableObject. If the object is non-local, an id and service interfaces will
     * be provided.
     *
     * @param id - optional name of the summarizable object.
     * @param runtime - component runtime thee object belongs to.
     * @param attributes - The attributes for the object.
     */
    constructor(id: string, runtime: IComponentRuntime, attributes: IChannelAttributes) {
        super(id, runtime, attributes);
    }

    /**
     * {@inheritDoc ISummarizableObject.get}
     */
    public get(key: string): Jsonable {
        return this.data.get(key);
    }

    /**
     * {@inheritDoc ISummarizableObject.set}
     */
    public set(key: string, value: Jsonable): void {
        this.data.set(key, value);

        // Set this object as dirty so that it is part of the next summary.
        this.dirty();
    }

    /**
     * {@inheritDoc @microsoft/fluid-shared-object-base#SharedObject.snapshot}
     */
    public snapshot(): ITree {
        const contentsBlob: ISummarizableObjectDataSerializable = {};
        this.data.forEach((value, key) => {
            contentsBlob[key] = value;
        });

        // Construct the tree for the data.
        const tree: ITree = {
            entries: [
                {
                    mode: FileMode.File,
                    path: snapshotFileName,
                    type: TreeEntry[TreeEntry.Blob],
                    value: {
                        contents: JSON.stringify(contentsBlob),
                        encoding: "utf-8",
                    },
                },
            ],
            // eslint-disable-next-line no-null/no-null
            id: null,
        };

        return tree;
    }

    /**
     * {@inheritDoc @microsoft/fluid-shared-object-base#SharedObject.loadCore}
     */
    protected async loadCore(
        branchId: string,
        storage: IObjectStorageService): Promise<void> {

        const rawContent = await storage.read(snapshotFileName);
        const contents = JSON.parse(fromBase64ToUtf8(rawContent)) as ISummarizableObjectDataSerializable;

        for (const [key, value] of Object.entries(contents)) {
            this.data.set(key, value);
        }
    }

    /**
     * {@inheritDoc @microsoft/fluid-shared-object-base#SharedObject.onConnect}
     */
    protected onConnect(pending: any[]) {}

    /**
     * {@inheritDoc @microsoft/fluid-shared-object-base#SharedObject.registerCore}
     */
    protected registerCore() {}

    /**
     * {@inheritDoc @microsoft/fluid-shared-object-base#SharedObject.onDisconnect}
     */
    protected onDisconnect() {}

    /**
     * {@inheritDoc @microsoft/fluid-shared-object-base#SharedObject.processCore}
     */
    protected processCore(message: ISequencedDocumentMessage, local: boolean) {
        throw new Error("Summarizable object should not generate any ops.");
    }
}