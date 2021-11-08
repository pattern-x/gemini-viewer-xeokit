import { buildGridGeometry, Mesh, PhongMaterial, Plugin, VBOGeometry } from "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js";

// export type NoParamCallback = () => void;// eslint-disable-line

// // eslint-disable-next-line @typescript-eslint/no-empty-function
// const emptyCallBack: NoParamCallback = () => {};

const GRID_ID = "grid";
// TODO:It will be modified according to the actual situation.
export interface GridMeshConfig {
    position: number[];
    pickable?: boolean;
    collidable?: boolean;
}

export interface GridGeometryConfig {
    size: number;
    division: number;
}

export interface GridConfig {
    active: boolean;
    gridMeshCfg?: GridMeshConfig;
    gridGeometryCfg?: GridGeometryConfig;
    gridMaterialCfg?: any; // eslint-disable-line
}

export class GridPlugin extends Plugin {
    private _gridMesh: any; // eslint-disable-line
    private _active: boolean;
    private _gridMeshCfg: GridMeshConfig;
    private _gridGeometryCfg: GridGeometryConfig;
    private _gridMaterialCfg: any; // eslint-disable-line

    constructor(viewer: any, cfg?: GridConfig) { // eslint-disable-line
        super("GridPlugin", viewer, cfg);

        this._active = cfg ? cfg.active : false;
        if (cfg && cfg.gridMeshCfg) {
            this._gridMeshCfg = cfg.gridMeshCfg;
        } else {
            this._gridMeshCfg = {
                position: [0, 0, 0],
                pickable: false,
                collidable: false,
            };
        }

        if (cfg && cfg.gridGeometryCfg) {
            this._gridGeometryCfg = cfg.gridGeometryCfg;
        } else {
            this._gridGeometryCfg = {
                size: 1000,
                division: 60,
            };
        }

        if (cfg && cfg.gridMaterialCfg) {
            this._gridMaterialCfg = cfg.gridMaterialCfg;
        } else {
            this._gridMaterialCfg = new PhongMaterial(viewer.scene, {
                color: [0.0, 0.0, 0.0],
                emissive: [0.4, 0.4, 0.4],
                alpha: 0.5,
            });
        }

        this._gridMesh = null;

        if (this._active) {
            this._createGrid();
        }
    }

    setActive(active: boolean) {
        if (this._active === active) {
            return;
        }
        this._active = active;
        this._controlGridActive();
    }

    getActive(): boolean {
        return this._active;
    }

    setMeshConfig(gridMeshCfg: GridMeshConfig): void {
        this._gridMeshCfg = gridMeshCfg;
        if (this._gridMesh) {
            this._gridMesh.position = gridMeshCfg.position;
            if (gridMeshCfg.pickable !== undefined) {
                this._gridMesh.pickable = gridMeshCfg.pickable;
            }
            if (gridMeshCfg.collidable !== undefined) {
                this._gridMesh.collidable = gridMeshCfg.collidable;
            }
        }
    }

    setMeshGeometryConfig(gridGeometryCfg: GridGeometryConfig): void {
        this._gridGeometryCfg = gridGeometryCfg;
        if (this._gridMesh) {
            const geometry = this._gridMesh.geometry;
            this._gridMesh.geometry = new VBOGeometry(
                this.viewer.scene,
                buildGridGeometry({
                    size: gridGeometryCfg.size,
                    divisions: gridGeometryCfg.division,
                })
            );

            geometry.destroy();
        }
    }

    destroy(): void {
        if (this._gridMesh) {
            this._gridMesh.geometry.destroy();
            this._gridMesh.material.destroy();
            this._gridMesh.destroy();
            this._gridMesh = null;
        }
        super.destroy();
    }

    private _controlGridActive(): void {
        //   const scene=this.viewer.scene;// eslint-disable-line
        //   if(scene.objects.hasOwnProperty(GRID_ID)){ // eslint-disable-line
        //   const mesh = scene.objects[GRID_ID];
        if (this._gridMesh) {
            const oriVisibleState = this._gridMesh.visible;
            if (oriVisibleState !== this._active) {
                this._gridMesh.visible = this._active;
            }
            return;
        }

        if (this._active) {
            this._createGrid();
        }
    }

    private _createGrid(): void {
        const scene = this.viewer.scene;
        const geomtry = new VBOGeometry(
            scene,
            buildGridGeometry({
                size: this._gridGeometryCfg.size,
                divisions: this._gridGeometryCfg.division,
            })
        );
        this._gridMesh = new Mesh(scene, {
            id: GRID_ID,
            isObject: true,
            geometry: geomtry,
            material: this._gridMaterialCfg,
            position: this._gridMeshCfg.position,
            collidable: this._gridMeshCfg.collidable || false,
            pickable: this._gridMeshCfg.pickable || false,
        });
    }
}
