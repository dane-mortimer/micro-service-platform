export interface IBaseService {
    /**
     * Required: Service name
     */
    name: string;

    /**
     * Port container is mapped to
     *
     * @default 80
     */
    port?: number;
}
