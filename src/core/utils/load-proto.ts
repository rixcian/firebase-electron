import protobuf from 'protobufjs';

export function loadProtoJson(descriptor: object): protobuf.Root {
  return protobuf.Root.fromJSON(descriptor);
}
