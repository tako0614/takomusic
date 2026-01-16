import { WebSocketServer, WebSocket } from 'ws'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

type CollabDoc = {
  doc: Y.Doc
  awareness: awarenessProtocol.Awareness
  connections: Set<WebSocket>
}

const messageSync = 0
const messageAwareness = 1

const docs = new Map<string, CollabDoc>()

const getDoc = (room: string): CollabDoc => {
  if (!docs.has(room)) {
    const doc = new Y.Doc()
    const awareness = new awarenessProtocol.Awareness(doc)
    docs.set(room, { doc, awareness, connections: new Set() })
  }
  return docs.get(room) as CollabDoc
}

const send = (ws: WebSocket, encoder: encoding.Encoder) => {
  if (ws.readyState !== ws.OPEN) return
  ws.send(encoding.toUint8Array(encoder))
}

const broadcast = (connections: Set<WebSocket>, encoder: encoding.Encoder, except?: WebSocket) => {
  const message = encoding.toUint8Array(encoder)
  for (const conn of connections) {
    if (conn === except || conn.readyState !== conn.OPEN) continue
    conn.send(message)
  }
}

const setupConnection = (ws: WebSocket, room: string) => {
  const collab = getDoc(room)
  collab.connections.add(ws)
  const awarenessIds = new Set<number>()

  const awarenessListener = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: any
  ) => {
    const changedClients = added.concat(updated, removed)
    if (changedClients.length === 0) return
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(collab.awareness, changedClients)
    )
    broadcast(collab.connections, encoder, origin)
  }

  collab.awareness.on('update', awarenessListener)

  ws.on('message', (data) => {
    const message = new Uint8Array(data as ArrayBuffer)
    const decoder = decoding.createDecoder(message)
    const messageType = decoding.readVarUint(decoder)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageType)

    if (messageType === messageSync) {
      syncProtocol.readSyncMessage(decoder, encoder, collab.doc, ws)
      if (encoding.length(encoder) > 1) {
        send(ws, encoder)
      }
      return
    }

    if (messageType === messageAwareness) {
      const update = decoding.readVarUint8Array(decoder)
      awarenessProtocol.applyAwarenessUpdate(collab.awareness, update, ws)
      const decoded = awarenessProtocol.decodeAwarenessUpdate(update)
      for (const [clientId] of decoded) {
        awarenessIds.add(clientId)
      }
      return
    }
  })

  ws.on('close', () => {
    collab.connections.delete(ws)
    if (awarenessIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(collab.awareness, Array.from(awarenessIds), ws)
    }
    collab.awareness.off('update', awarenessListener)
    if (collab.connections.size === 0) {
      collab.doc.destroy()
      docs.delete(room)
    }
  })

  const syncEncoder = encoding.createEncoder()
  encoding.writeVarUint(syncEncoder, messageSync)
  syncProtocol.writeSyncStep1(syncEncoder, collab.doc)
  send(ws, syncEncoder)

  const awarenessEncoder = encoding.createEncoder()
  encoding.writeVarUint(awarenessEncoder, messageAwareness)
  encoding.writeVarUint8Array(
    awarenessEncoder,
    awarenessProtocol.encodeAwarenessUpdate(
      collab.awareness,
      Array.from(collab.awareness.getStates().keys())
    )
  )
  send(ws, awarenessEncoder)
}

export const startCollabServer = (port = 8787) => {
  const server = new WebSocketServer({ port })
  server.on('connection', (ws, request) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`)
    const room = url.searchParams.get('room') || url.pathname.replace(/^\/+/, '') || 'default'
    setupConnection(ws as WebSocket, room)
  })

  console.log(`TakoMusic collab server listening on ws://localhost:${port}`)
  return server
}

if (process.argv[1] && process.argv[1].includes('collabServer')) {
  const portArg = process.argv.find((arg) => arg.startsWith('--port='))
  const port = portArg ? Number.parseInt(portArg.split('=')[1] ?? '8787', 10) : 8787
  startCollabServer(Number.isFinite(port) ? port : 8787)
}
