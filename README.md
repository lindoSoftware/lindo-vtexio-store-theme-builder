# Store theme builder
## Estructura de servicio VTEX IO

```
.
├── node/
│   ├── resolvers/               # Resolvers de GraphQL
│   ├── mappers/                 # Mappers
│   ├── middlewares/             # External Middlewares
│   ├── services/                # Lógica de servicios (VTEX API, Masterdata, etc.)
│   ├── typings/                 # Tipos e interfaces TypeScript
│   ├── utils/                   # configs, constants, etc
│   ├── index.ts                 # Punto de entrada del servicio
├── graphql/
│   ├── schema.graphql           # Esquema GraphQL
├── manifest.json                # Configuración del proyecto
├── service.json                 # Configuración del servicio
├── package.json                 # Dependencias del proyecto
└── README.md                    # Documentación del proyecto
```

## Endpoints disponibles


## Graphql disponibles


## Queries

ConfigView
```
query {
  configView {
    websiteEnabled
    substitutionCriteriaEnabled
    addToCartWithSellerEnabled
		incrementerInputEnabled
    cartsByCategories
  }
}
```

## install
node version v20

```
yarn install
vtex setup
vtex link
```


