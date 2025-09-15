import pytest
import json
import struct
from unittest.mock import patch, MagicMock
import io

import syncmark_host
from syncmark_host import get_message, send_message

def test_get_message_reads_correctly():
    """
    Vérifie que get_message décode correctement un message depuis stdin.
    """
    message_data = {'command': 'test'}
    message_json = json.dumps(message_data).encode('utf-8')
    message_length = struct.pack('@I', len(message_json))

    # On ne peut pas patcher sys.stdin.buffer directement, on patche sys.stdin
    fake_stdin = MagicMock()
    fake_stdin.buffer = io.BytesIO(message_length + message_json)

    with patch('sys.stdin', fake_stdin):
        decoded_message = get_message()

    assert decoded_message == message_data

def test_get_message_handles_eof():
    """
    Vérifie que get_message retourne None si le flux stdin est fermé (EOF).
    """
    fake_stdin = MagicMock()
    fake_stdin.buffer = io.BytesIO(b'')

    with patch('sys.stdin', fake_stdin):
        assert get_message() is None

def test_send_message_writes_correctly():
    """
    Vérifie que send_message encode et envoie un message correctement à stdout.
    """
    message_data = {'status': 'ok'}

    # On patche sys.stdout de la même manière
    fake_stdout = MagicMock()
    fake_stdout.buffer = io.BytesIO()

    with patch('sys.stdout', fake_stdout):
        send_message(message_data)

    # Récupérer les données écrites depuis le buffer de notre mock
    fake_stdout.buffer.seek(0)
    raw_length = fake_stdout.buffer.read(4)
    message_length = struct.unpack('@I', raw_length)[0]

    message_json = fake_stdout.buffer.read(message_length).decode('utf-8')
    sent_message = json.loads(message_json)

    expected_json = json.dumps(message_data).encode('utf-8')
    assert message_length == len(expected_json)
    assert sent_message == message_data
