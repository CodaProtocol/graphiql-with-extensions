import React, {Component} from 'react';
import GraphiQL from 'graphiql';
import GraphiQLExplorer from 'graphiql-explorer';
import CodeExporter from 'graphiql-code-exporter';
import codeExporterDefaultSnippets from 'graphiql-code-exporter/lib/snippets';
import {buildClientSchema, getIntrospectionQuery, parse} from 'graphql';

import '../index.css';

class GraphiQLWithExtensions extends Component {
  _graphiql: GraphiQL;
  state = {
    schema: null,
    variables: '',
    query: this.props.query,
    explorerIsOpen: this.props.explorerIsOpen,
    exporterIsOpen: this.props.exporterIsOpen,
    disableExplorer: this.props.disableExplorer,
    disableExporter: this.props.disableExporter,
  };

  componentDidMount() {
    this.props
      .fetcher({
        query: getIntrospectionQuery(),
      })
      .then(result => {
        const editor = this._graphiql.getQueryEditor();
        editor.setOption('extraKeys', {
          ...(editor.options.extraKeys || {}),
          'Shift-Alt-LeftClick': this._handleInspectOperation,
        });

        this.setState({schema: buildClientSchema(result.data)});
      });
  }

  _handleInspectOperation = (cm: any, mousePos: {line: Number, ch: Number}) => {
    let parsedQuery;
    try {
      parsedQuery = parse(this.state.query || '');
    } catch (error) {
      console.error('Error parsing query: ', error);
      return;
    }
    if (!parsedQuery) {
      console.error("Couldn't parse query document");
      return null;
    }

    var token = cm.getTokenAt(mousePos);
    var start = {line: mousePos.line, ch: token.start};
    var end = {line: mousePos.line, ch: token.end};
    var relevantMousePos = {
      start: cm.indexFromPos(start),
      end: cm.indexFromPos(end),
    };

    var position = relevantMousePos;

    var def = parsedQuery.definitions.find(definition => {
      if (!definition.loc) {
        console.log('Missing location information for definition');
        return false;
      }

      const {start, end} = definition.loc;
      return start <= position.start && end >= position.end;
    });

    if (!def) {
      console.error(
        'Unable to find definition corresponding to mouse position',
      );
      return null;
    }

    var operationKind =
      def.kind === 'OperationDefinition'
        ? def.operation
        : def.kind === 'FragmentDefinition'
        ? 'fragment'
        : 'unknown';

    var operationName =
      def.kind === 'OperationDefinition' && !!def.name
        ? def.name.value
        : def.kind === 'FragmentDefinition' && !!def.name
        ? def.name.value
        : 'unknown';

    var selector = `.graphiql-explorer-root #${operationKind}-${operationName}`;

    var el = document.querySelector(selector);
    el && el.scrollIntoView();
  };

  _handleEditQuery = (query: string): void => {
    if (this.props.onEditQuery) {
      this.props.onEditQuery(query);
    }
    this.setState({query})
  };

  _handleToggleExplorer = () => {
    this.setState({explorerIsOpen: !this.state.explorerIsOpen});
  };

  _handleToggleExporter = () =>
    this.setState({
      exporterIsOpen: !this.state.exporterIsOpen,
    });

  _handleEditVariables = (variables: string) => {
    if (this.props.onEditVariables) {
      this.props.onEditVariables(query);
    }
    this.setState({variables});
  };

  render() {
    const {query, schema} = this.state;

    const codeExporter = this.state.exporterIsOpen ? (
      <CodeExporter
        hideCodeExporter={this._handleToggleCodeExporter}
        snippets={codeExporterDefaultSnippets}
        serverUrl={this.props.serverUrl}
        headers={{}}
        query={query}
        // Optional if you want to use a custom theme
        codeMirrorTheme="neo"
      />
    ) : null;

    return (
      <div className="graphiql-container">
        {this.props.disableExplorer ? null : (
          <GraphiQLExplorer
            schema={schema}
            query={query}
            onEdit={this._handleEditQuery}
            explorerIsOpen={this.state.explorerIsOpen}
            onToggleExplorer={this._handleToggleExplorer}
          />
        )}
        <GraphiQL
          ref={ref => (this._graphiql = ref)}
          fetcher={this.props.fetcher}
          schema={schema}
          query={query}
          onEditQuery={this._handleEditQuery}>
          <GraphiQL.Toolbar>
            <GraphiQL.Button
              onClick={() => this._graphiql.handlePrettifyQuery()}
              label="Prettify"
              title="Prettify Query (Shift-Ctrl-P)"
            />
            <GraphiQL.Button
              onClick={() => this._graphiql.handleToggleHistory()}
              label="History"
              title="Show History"
            />
            {this.props.disableExplorer ? null : (
              <GraphiQL.Button
                onClick={this._handleToggleExplorer}
                label="Explorer"
                title="Toggle Explorer"
              />
            )}
            {this.props.disableExporter ? null : (
              <GraphiQL.Button
                onClick={this._handleToggleExporter}
                label="Exporter"
                title="Toggle Exporter"
              />
            )}
          </GraphiQL.Toolbar>
        </GraphiQL>
        {codeExporter}
      </div>
    );
  }
}

export default GraphiQLWithExtensions;
