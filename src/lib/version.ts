// Versão do sistema, lida do package.json (é o único lugar a atualizar ao publicar uma versão).
import pkg from "../../package.json";

export const APP_VERSION: string = pkg.version;
