import * as assert from 'assert';
import { MemoryParticipant } from '../../chat/MemoryParticipant';

suite('Memory Participant Test Suite', () => {
  test('Memory Participant should have correct ID', () => {
    const participant = new MemoryParticipant();
    assert.strictEqual(participant.id, 'memory-bank');
  });

  test('Memory Participant should exist and be creatable', () => {
    const participant = new MemoryParticipant();
    assert.ok(participant);
    assert.strictEqual(typeof participant.handler, 'function');
    assert.strictEqual(participant.id, 'memory-bank');
  });
});
