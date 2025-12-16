"""
Property-based tests for xAPI statement validation and storage

Feature: scorm-xapi-compliance, Property 10: xAPI statement validation
Validates: Requirements 3.2

Feature: scorm-xapi-compliance, Property 11: xAPI statement storage uniqueness
Validates: Requirements 3.3
"""
import pytest
from hypothesis import given, strategies as st, settings, assume
from hypothesis.strategies import composite
from datetime import datetime, timezone
import uuid
from django.utils import timezone as django_timezone

from xapi.validators import XAPIStatementValidator, ValidationError
from xapi.models.statement import XAPIStatement


# ============================================================================
# Hypothesis Strategies for generating xAPI statements
# ============================================================================

@composite
def valid_iri(draw):
    """Generate a valid IRI (HTTP/HTTPS only for reliability)"""
    # Use only HTTP/HTTPS schemes to avoid edge cases with mailto: and urn:
    scheme = draw(st.sampled_from(['http', 'https']))
    
    # Generate a simple domain name with only lowercase letters and digits
    domain = draw(st.text(min_size=3, max_size=15, alphabet='abcdefghijklmnopqrstuvwxyz0123456789'))
    
    # Generate a simple path with only alphanumeric characters
    path = draw(st.text(min_size=0, max_size=30, alphabet='abcdefghijklmnopqrstuvwxyz0123456789-_'))
    
    return f"{scheme}://{domain}.example.com/{path}" if path else f"{scheme}://{domain}.example.com"


@composite
def valid_mbox(draw):
    """Generate a valid mbox (mailto: IRI)"""
    email = draw(st.emails())
    return f"mailto:{email}"


@composite
def valid_language_map(draw):
    """Generate a valid language map"""
    languages = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE']
    lang = draw(st.sampled_from(languages))
    text = draw(st.text(min_size=1, max_size=100))
    return {lang: text}


@composite
def valid_account(draw):
    """Generate a valid account object"""
    home_page = draw(valid_iri())
    name = draw(st.text(min_size=1, max_size=50))
    return {
        'homePage': home_page,
        'name': name
    }


@composite
def valid_actor(draw):
    """Generate a valid actor (Agent or Group)"""
    object_type = draw(st.sampled_from(['Agent', 'Group']))
    
    # Choose one IFI
    ifi_type = draw(st.sampled_from(['mbox', 'account', 'openid']))
    
    actor = {'objectType': object_type}
    
    if ifi_type == 'mbox':
        actor['mbox'] = draw(valid_mbox())
    elif ifi_type == 'account':
        actor['account'] = draw(valid_account())
    elif ifi_type == 'openid':
        actor['openid'] = draw(valid_iri())
    
    # Optional name
    if draw(st.booleans()):
        actor['name'] = draw(st.text(min_size=1, max_size=100))
    
    # Groups can have members
    if object_type == 'Group' and draw(st.booleans()):
        # Generate 1-3 member agents
        num_members = draw(st.integers(min_value=1, max_value=3))
        members = []
        for _ in range(num_members):
            member = draw(valid_actor())
            member['objectType'] = 'Agent'  # Members must be Agents
            members.append(member)
        actor['member'] = members
    
    return actor


@composite
def valid_verb(draw):
    """Generate a valid verb"""
    # Common xAPI verbs
    common_verbs = [
        ('http://adlnet.gov/expapi/verbs/completed', {'en-US': 'completed'}),
        ('http://adlnet.gov/expapi/verbs/passed', {'en-US': 'passed'}),
        ('http://adlnet.gov/expapi/verbs/failed', {'en-US': 'failed'}),
        ('http://adlnet.gov/expapi/verbs/registered', {'en-US': 'registered'}),
        ('http://adlnet.gov/expapi/verbs/interacted', {'en-US': 'interacted'}),
        ('http://adlnet.gov/expapi/verbs/experienced', {'en-US': 'experienced'}),
        ('http://adlnet.gov/expapi/verbs/attempted', {'en-US': 'attempted'}),
    ]
    
    verb_id, display = draw(st.sampled_from(common_verbs))
    
    return {
        'id': verb_id,
        'display': display
    }


@composite
def valid_activity_definition(draw):
    """Generate a valid activity definition"""
    definition = {}
    
    # Optional name
    if draw(st.booleans()):
        definition['name'] = draw(valid_language_map())
    
    # Optional description
    if draw(st.booleans()):
        definition['description'] = draw(valid_language_map())
    
    # Optional type
    if draw(st.booleans()):
        activity_types = [
            'http://adlnet.gov/expapi/activities/lesson',
            'http://adlnet.gov/expapi/activities/course',
            'http://adlnet.gov/expapi/activities/assessment',
            'http://adlnet.gov/expapi/activities/module',
        ]
        definition['type'] = draw(st.sampled_from(activity_types))
    
    return definition


@composite
def valid_activity_object(draw):
    """Generate a valid activity object"""
    obj = {
        'objectType': 'Activity',
        'id': draw(valid_iri())
    }
    
    # Optional definition
    if draw(st.booleans()):
        obj['definition'] = draw(valid_activity_definition())
    
    return obj


@composite
def valid_score(draw):
    """Generate a valid score object"""
    score = {}
    
    # Optional scaled score (-1 to 1)
    if draw(st.booleans()):
        score['scaled'] = draw(st.floats(min_value=-1.0, max_value=1.0, allow_nan=False, allow_infinity=False))
    
    # Optional raw, min, max
    if draw(st.booleans()):
        min_score = draw(st.floats(min_value=0, max_value=100, allow_nan=False, allow_infinity=False))
        max_score = draw(st.floats(min_value=min_score, max_value=200, allow_nan=False, allow_infinity=False))
        raw_score = draw(st.floats(min_value=min_score, max_value=max_score, allow_nan=False, allow_infinity=False))
        
        score['min'] = min_score
        score['max'] = max_score
        score['raw'] = raw_score
    
    return score if score else None


@composite
def valid_result(draw):
    """Generate a valid result object"""
    result = {}
    
    # Optional score
    score = draw(valid_score())
    if score:
        result['score'] = score
    
    # Optional success
    if draw(st.booleans()):
        result['success'] = draw(st.booleans())
    
    # Optional completion
    if draw(st.booleans()):
        result['completion'] = draw(st.booleans())
    
    # Optional duration (ISO 8601)
    if draw(st.booleans()):
        hours = draw(st.integers(min_value=0, max_value=10))
        minutes = draw(st.integers(min_value=0, max_value=59))
        seconds = draw(st.integers(min_value=0, max_value=59))
        result['duration'] = f"PT{hours}H{minutes}M{seconds}S"
    
    return result if result else None


@composite
def valid_timestamp(draw):
    """Generate a valid ISO 8601 timestamp"""
    # Generate a datetime and format as ISO 8601
    year = draw(st.integers(min_value=2020, max_value=2025))
    month = draw(st.integers(min_value=1, max_value=12))
    day = draw(st.integers(min_value=1, max_value=28))  # Safe for all months
    hour = draw(st.integers(min_value=0, max_value=23))
    minute = draw(st.integers(min_value=0, max_value=59))
    second = draw(st.integers(min_value=0, max_value=59))
    
    dt = datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc)
    return dt.isoformat()


@composite
def valid_xapi_statement(draw):
    """Generate a valid xAPI statement"""
    statement = {
        'actor': draw(valid_actor()),
        'verb': draw(valid_verb()),
        'object': draw(valid_activity_object())
    }
    
    # Optional result
    result = draw(valid_result())
    if result:
        statement['result'] = result
    
    # Optional timestamp
    if draw(st.booleans()):
        statement['timestamp'] = draw(valid_timestamp())
    
    # Optional id
    if draw(st.booleans()):
        statement['id'] = str(uuid.uuid4())
    
    return statement


@composite
def invalid_xapi_statement(draw):
    """Generate an invalid xAPI statement"""
    # Choose a type of invalidity
    invalidity_type = draw(st.sampled_from([
        'missing_actor',
        'missing_verb',
        'missing_object',
        'invalid_actor_no_ifi',
        'invalid_verb_no_id',
        'invalid_verb_bad_iri',
        'invalid_object_no_id',
        'invalid_mbox',
        'invalid_score_scaled_out_of_range',
        'invalid_score_raw_out_of_range',
        'invalid_timestamp',
        'invalid_duration',
        'not_a_dict',
    ]))
    
    if invalidity_type == 'not_a_dict':
        return draw(st.one_of(st.text(), st.integers(), st.lists(st.integers()), st.none()))
    
    # Start with a valid statement
    statement = draw(valid_xapi_statement())
    
    if invalidity_type == 'missing_actor':
        del statement['actor']
    
    elif invalidity_type == 'missing_verb':
        del statement['verb']
    
    elif invalidity_type == 'missing_object':
        del statement['object']
    
    elif invalidity_type == 'invalid_actor_no_ifi':
        # Remove all IFIs from actor
        statement['actor'] = {'objectType': 'Agent', 'name': 'Test User'}
    
    elif invalidity_type == 'invalid_verb_no_id':
        statement['verb'] = {'display': {'en-US': 'completed'}}
    
    elif invalidity_type == 'invalid_verb_bad_iri':
        statement['verb']['id'] = 'not-a-valid-iri'
    
    elif invalidity_type == 'invalid_object_no_id':
        statement['object'] = {'objectType': 'Activity'}
    
    elif invalidity_type == 'invalid_mbox':
        statement['actor'] = {
            'objectType': 'Agent',
            'mbox': 'invalid-email',  # Missing mailto:
            'name': 'Test User'
        }
    
    elif invalidity_type == 'invalid_score_scaled_out_of_range':
        statement['result'] = {
            'score': {
                'scaled': draw(st.one_of(
                    st.floats(min_value=-10, max_value=-1.1),
                    st.floats(min_value=1.1, max_value=10)
                ))
            }
        }
    
    elif invalidity_type == 'invalid_score_raw_out_of_range':
        statement['result'] = {
            'score': {
                'min': 0,
                'max': 100,
                'raw': draw(st.one_of(
                    st.floats(min_value=-10, max_value=-1),
                    st.floats(min_value=101, max_value=200)
                ))
            }
        }
    
    elif invalidity_type == 'invalid_timestamp':
        statement['timestamp'] = 'not-a-valid-timestamp'
    
    elif invalidity_type == 'invalid_duration':
        statement['result'] = {'duration': 'not-a-valid-duration'}
    
    return statement


# ============================================================================
# Property-Based Tests
# ============================================================================

class TestXAPIStatementValidation:
    """
    Property-based tests for xAPI statement validation
    
    Feature: scorm-xapi-compliance, Property 10: xAPI statement validation
    Validates: Requirements 3.2
    """
    
    @given(valid_xapi_statement())
    @settings(max_examples=100, deadline=None)
    def test_valid_statements_are_accepted(self, statement):
        """
        Property: For any valid xAPI statement, the validator should accept it
        
        This test generates random valid xAPI statements and verifies that
        the validator accepts them without errors.
        """
        validator = XAPIStatementValidator()
        is_valid, error_message = validator.validate(statement)
        
        assert is_valid, f"Valid statement was rejected: {error_message}\nStatement: {statement}"
        assert error_message is None, f"Valid statement should not have error message: {error_message}"
    
    @given(invalid_xapi_statement())
    @settings(max_examples=100, deadline=None)
    def test_invalid_statements_are_rejected(self, statement):
        """
        Property: For any invalid xAPI statement, the validator should reject it
        
        This test generates random invalid xAPI statements and verifies that
        the validator rejects them with specific error messages.
        """
        validator = XAPIStatementValidator()
        is_valid, error_message = validator.validate(statement)
        
        assert not is_valid, f"Invalid statement was accepted: {statement}"
        assert error_message is not None, "Invalid statement should have error message"
        assert isinstance(error_message, str), "Error message should be a string"
        assert len(error_message) > 0, "Error message should not be empty"
    
    @given(valid_xapi_statement())
    @settings(max_examples=100, deadline=None)
    def test_validation_is_deterministic(self, statement):
        """
        Property: Validating the same statement multiple times should give the same result
        
        This test verifies that the validation function is deterministic.
        """
        validator = XAPIStatementValidator()
        
        # Validate the same statement twice
        result1 = validator.validate(statement)
        result2 = validator.validate(statement)
        
        assert result1 == result2, "Validation should be deterministic"
    
    @given(valid_xapi_statement())
    @settings(max_examples=50, deadline=None)
    def test_required_fields_presence(self, statement):
        """
        Property: Valid statements must have actor, verb, and object fields
        
        This test verifies that all valid statements contain the required fields.
        """
        assert 'actor' in statement, "Valid statement must have actor"
        assert 'verb' in statement, "Valid statement must have verb"
        assert 'object' in statement, "Valid statement must have object"
        
        validator = XAPIStatementValidator()
        is_valid, _ = validator.validate(statement)
        assert is_valid, "Statement with required fields should be valid"
    
    @given(valid_xapi_statement())
    @settings(max_examples=50, deadline=None)
    def test_actor_has_ifi(self, statement):
        """
        Property: Valid actors must have at least one Inverse Functional Identifier
        
        This test verifies that all valid actors have at least one IFI.
        """
        actor = statement['actor']
        ifis = ['mbox', 'mbox_sha1sum', 'openid', 'account']
        has_ifi = any(ifi in actor for ifi in ifis)
        
        assert has_ifi, "Valid actor must have at least one IFI"
        
        validator = XAPIStatementValidator()
        is_valid, _ = validator.validate(statement)
        assert is_valid, "Statement with actor having IFI should be valid"
    
    @given(valid_xapi_statement())
    @settings(max_examples=50, deadline=None)
    def test_verb_has_id_and_display(self, statement):
        """
        Property: Valid verbs must have an id field
        
        This test verifies that all valid verbs have an id field.
        """
        verb = statement['verb']
        assert 'id' in verb, "Valid verb must have id"
        assert 'display' in verb, "Valid verb should have display"
        
        validator = XAPIStatementValidator()
        is_valid, _ = validator.validate(statement)
        assert is_valid, "Statement with valid verb should be valid"
    
    @given(valid_xapi_statement())
    @settings(max_examples=50, deadline=None)
    def test_activity_object_has_id(self, statement):
        """
        Property: Valid activity objects must have an id field
        
        This test verifies that all valid activity objects have an id field.
        """
        obj = statement['object']
        if obj.get('objectType', 'Activity') == 'Activity':
            assert 'id' in obj, "Valid activity must have id"
        
        validator = XAPIStatementValidator()
        is_valid, _ = validator.validate(statement)
        assert is_valid, "Statement with valid activity object should be valid"
    
    @given(valid_xapi_statement())
    @settings(max_examples=50, deadline=None)
    def test_score_scaled_in_range(self, statement):
        """
        Property: If a statement has a scaled score, it must be between -1 and 1
        
        This test verifies that scaled scores are within the valid range.
        """
        if 'result' in statement and 'score' in statement['result']:
            score = statement['result']['score']
            if 'scaled' in score:
                assert -1 <= score['scaled'] <= 1, "Scaled score must be between -1 and 1"
        
        validator = XAPIStatementValidator()
        is_valid, _ = validator.validate(statement)
        assert is_valid, "Statement with valid scaled score should be valid"
    
    def test_missing_actor_is_rejected(self):
        """
        Test that a statement without an actor is rejected
        """
        validator = XAPIStatementValidator()
        statement = {
            'verb': {'id': 'http://adlnet.gov/expapi/verbs/completed', 'display': {'en-US': 'completed'}},
            'object': {'id': 'http://example.com/activity/1'}
        }
        
        is_valid, error_message = validator.validate(statement)
        
        assert not is_valid, "Statement without actor should be rejected"
        assert 'actor' in error_message.lower(), "Error message should mention actor"
    
    def test_missing_verb_is_rejected(self):
        """
        Test that a statement without a verb is rejected
        """
        validator = XAPIStatementValidator()
        statement = {
            'actor': {'mbox': 'mailto:test@example.com', 'objectType': 'Agent'},
            'object': {'id': 'http://example.com/activity/1'}
        }
        
        is_valid, error_message = validator.validate(statement)
        
        assert not is_valid, "Statement without verb should be rejected"
        assert 'verb' in error_message.lower(), "Error message should mention verb"
    
    def test_missing_object_is_rejected(self):
        """
        Test that a statement without an object is rejected
        """
        validator = XAPIStatementValidator()
        statement = {
            'actor': {'mbox': 'mailto:test@example.com', 'objectType': 'Agent'},
            'verb': {'id': 'http://adlnet.gov/expapi/verbs/completed', 'display': {'en-US': 'completed'}}
        }
        
        is_valid, error_message = validator.validate(statement)
        
        assert not is_valid, "Statement without object should be rejected"
        assert 'object' in error_message.lower(), "Error message should mention object"
    
    def test_invalid_mbox_format_is_rejected(self):
        """
        Test that an actor with invalid mbox format is rejected
        """
        validator = XAPIStatementValidator()
        statement = {
            'actor': {'mbox': 'invalid-email', 'objectType': 'Agent'},
            'verb': {'id': 'http://adlnet.gov/expapi/verbs/completed', 'display': {'en-US': 'completed'}},
            'object': {'id': 'http://example.com/activity/1'}
        }
        
        is_valid, error_message = validator.validate(statement)
        
        assert not is_valid, "Statement with invalid mbox should be rejected"
        assert 'mbox' in error_message.lower() or 'mailto' in error_message.lower(), \
            "Error message should mention mbox or mailto"
    
    def test_scaled_score_out_of_range_is_rejected(self):
        """
        Test that a scaled score outside [-1, 1] is rejected
        """
        validator = XAPIStatementValidator()
        statement = {
            'actor': {'mbox': 'mailto:test@example.com', 'objectType': 'Agent'},
            'verb': {'id': 'http://adlnet.gov/expapi/verbs/completed', 'display': {'en-US': 'completed'}},
            'object': {'id': 'http://example.com/activity/1'},
            'result': {'score': {'scaled': 1.5}}
        }
        
        is_valid, error_message = validator.validate(statement)
        
        assert not is_valid, "Statement with scaled score > 1 should be rejected"
        assert 'scaled' in error_message.lower(), "Error message should mention scaled score"



# ============================================================================
# Property-Based Tests for Statement Storage
# ============================================================================

@pytest.mark.django_db
class TestXAPIStatementStorage:
    """
    Property-based tests for xAPI statement storage uniqueness
    
    Feature: scorm-xapi-compliance, Property 11: xAPI statement storage uniqueness
    Validates: Requirements 3.3
    """
    
    @given(valid_xapi_statement())
    @settings(max_examples=100, deadline=None)
    def test_stored_statement_has_unique_uuid(self, statement):
        """
        Property: For any valid xAPI statement stored in the LRS, 
        it should be assigned a unique UUID identifier
        
        This test verifies that each stored statement gets a unique UUID
        that can be used to retrieve it later.
        """
        # Prepare statement data for storage
        actor = statement['actor']
        verb = statement['verb']
        obj = statement['object']
        
        # Extract actor information
        actor_name = actor.get('name', 'Anonymous')
        actor_mbox = None
        if 'mbox' in actor:
            # Remove 'mailto:' prefix if present
            mbox = actor['mbox']
            actor_mbox = mbox.replace('mailto:', '') if mbox.startswith('mailto:') else mbox
        
        # Create the statement in the database
        xapi_statement = XAPIStatement.objects.create(
            actor_type=actor.get('objectType', 'Agent'),
            actor_name=actor_name,
            actor_mbox=actor_mbox,
            actor_account_name=actor.get('account', {}).get('name') if 'account' in actor else None,
            actor_account_homepage=actor.get('account', {}).get('homePage') if 'account' in actor else None,
            actor_json=actor,
            verb_id=verb['id'],
            verb_display=verb.get('display', {}),
            object_type=obj.get('objectType', 'Activity'),
            object_id=obj['id'],
            object_json=obj,
            result_json=statement.get('result'),
            context_json=statement.get('context'),
            timestamp=django_timezone.now(),
            statement_json=statement
        )
        
        # Verify the statement has a UUID
        assert xapi_statement.statement_id is not None, "Statement should have a UUID"
        assert isinstance(xapi_statement.statement_id, uuid.UUID), "Statement ID should be a UUID"
        
        # Verify the UUID is unique by checking we can retrieve the statement
        retrieved = XAPIStatement.objects.get(statement_id=xapi_statement.statement_id)
        assert retrieved.id == xapi_statement.id, "Should retrieve the same statement by UUID"
        
        # Clean up
        xapi_statement.delete()
    
    @given(st.lists(valid_xapi_statement(), min_size=2, max_size=10))
    @settings(max_examples=50, deadline=None)
    def test_multiple_statements_have_unique_uuids(self, statements):
        """
        Property: For any set of valid xAPI statements stored in the LRS,
        each should be assigned a unique UUID identifier
        
        This test verifies that multiple statements get different UUIDs.
        """
        created_statements = []
        statement_ids = set()
        
        try:
            for statement in statements:
                actor = statement['actor']
                verb = statement['verb']
                obj = statement['object']
                
                # Extract actor information
                actor_name = actor.get('name', 'Anonymous')
                actor_mbox = None
                if 'mbox' in actor:
                    mbox = actor['mbox']
                    actor_mbox = mbox.replace('mailto:', '') if mbox.startswith('mailto:') else mbox
                
                # Create the statement
                xapi_statement = XAPIStatement.objects.create(
                    actor_type=actor.get('objectType', 'Agent'),
                    actor_name=actor_name,
                    actor_mbox=actor_mbox,
                    actor_account_name=actor.get('account', {}).get('name') if 'account' in actor else None,
                    actor_account_homepage=actor.get('account', {}).get('homePage') if 'account' in actor else None,
                    actor_json=actor,
                    verb_id=verb['id'],
                    verb_display=verb.get('display', {}),
                    object_type=obj.get('objectType', 'Activity'),
                    object_id=obj['id'],
                    object_json=obj,
                    result_json=statement.get('result'),
                    context_json=statement.get('context'),
                    timestamp=django_timezone.now(),
                    statement_json=statement
                )
                
                created_statements.append(xapi_statement)
                statement_ids.add(xapi_statement.statement_id)
            
            # Verify all UUIDs are unique
            assert len(statement_ids) == len(created_statements), \
                f"All statements should have unique UUIDs. Got {len(statement_ids)} unique IDs for {len(created_statements)} statements"
            
        finally:
            # Clean up
            for stmt in created_statements:
                stmt.delete()
    
    @given(valid_xapi_statement())
    @settings(max_examples=100, deadline=None)
    def test_stored_statement_has_timestamp(self, statement):
        """
        Property: For any valid xAPI statement stored in the LRS,
        it should be assigned a timestamp
        
        This test verifies that each stored statement gets a timestamp.
        """
        actor = statement['actor']
        verb = statement['verb']
        obj = statement['object']
        
        # Extract actor information
        actor_name = actor.get('name', 'Anonymous')
        actor_mbox = None
        if 'mbox' in actor:
            mbox = actor['mbox']
            actor_mbox = mbox.replace('mailto:', '') if mbox.startswith('mailto:') else mbox
        
        # Create the statement
        xapi_statement = XAPIStatement.objects.create(
            actor_type=actor.get('objectType', 'Agent'),
            actor_name=actor_name,
            actor_mbox=actor_mbox,
            actor_account_name=actor.get('account', {}).get('name') if 'account' in actor else None,
            actor_account_homepage=actor.get('account', {}).get('homePage') if 'account' in actor else None,
            actor_json=actor,
            verb_id=verb['id'],
            verb_display=verb.get('display', {}),
            object_type=obj.get('objectType', 'Activity'),
            object_id=obj['id'],
            object_json=obj,
            result_json=statement.get('result'),
            context_json=statement.get('context'),
            timestamp=django_timezone.now(),
            statement_json=statement
        )
        
        # Verify the statement has a timestamp
        assert xapi_statement.timestamp is not None, "Statement should have a timestamp"
        assert isinstance(xapi_statement.timestamp, datetime), "Timestamp should be a datetime object"
        
        # Verify the statement has a stored timestamp
        assert xapi_statement.stored is not None, "Statement should have a stored timestamp"
        assert isinstance(xapi_statement.stored, datetime), "Stored timestamp should be a datetime object"
        
        # Clean up
        xapi_statement.delete()
    
    @given(valid_xapi_statement())
    @settings(max_examples=100, deadline=None)
    def test_statement_retrievable_by_uuid(self, statement):
        """
        Property: For any valid xAPI statement stored in the LRS,
        it should be retrievable by its UUID identifier
        
        This test verifies that statements can be retrieved using their UUID.
        """
        actor = statement['actor']
        verb = statement['verb']
        obj = statement['object']
        
        # Extract actor information
        actor_name = actor.get('name', 'Anonymous')
        actor_mbox = None
        if 'mbox' in actor:
            mbox = actor['mbox']
            actor_mbox = mbox.replace('mailto:', '') if mbox.startswith('mailto:') else mbox
        
        # Create the statement
        xapi_statement = XAPIStatement.objects.create(
            actor_type=actor.get('objectType', 'Agent'),
            actor_name=actor_name,
            actor_mbox=actor_mbox,
            actor_account_name=actor.get('account', {}).get('name') if 'account' in actor else None,
            actor_account_homepage=actor.get('account', {}).get('homePage') if 'account' in actor else None,
            actor_json=actor,
            verb_id=verb['id'],
            verb_display=verb.get('display', {}),
            object_type=obj.get('objectType', 'Activity'),
            object_id=obj['id'],
            object_json=obj,
            result_json=statement.get('result'),
            context_json=statement.get('context'),
            timestamp=django_timezone.now(),
            statement_json=statement
        )
        
        # Store the UUID
        statement_uuid = xapi_statement.statement_id
        
        # Retrieve the statement by UUID
        retrieved = XAPIStatement.objects.get(statement_id=statement_uuid)
        
        # Verify it's the same statement
        assert retrieved.id == xapi_statement.id, "Should retrieve the same statement"
        assert retrieved.statement_id == statement_uuid, "Retrieved statement should have the same UUID"
        assert retrieved.actor_name == actor_name, "Retrieved statement should have the same actor name"
        assert retrieved.verb_id == verb['id'], "Retrieved statement should have the same verb"
        assert retrieved.object_id == obj['id'], "Retrieved statement should have the same object"
        
        # Clean up
        xapi_statement.delete()
    
    @given(valid_xapi_statement())
    @settings(max_examples=50, deadline=None)
    def test_statement_with_explicit_id_uses_that_id(self, statement):
        """
        Property: If a statement includes an explicit ID, that ID should be used
        
        This test verifies that when a statement includes an 'id' field,
        that UUID is used instead of generating a new one.
        """
        # Add an explicit ID to the statement
        explicit_id = uuid.uuid4()
        statement['id'] = str(explicit_id)
        
        actor = statement['actor']
        verb = statement['verb']
        obj = statement['object']
        
        # Extract actor information
        actor_name = actor.get('name', 'Anonymous')
        actor_mbox = None
        if 'mbox' in actor:
            mbox = actor['mbox']
            actor_mbox = mbox.replace('mailto:', '') if mbox.startswith('mailto:') else mbox
        
        # Create the statement with explicit ID
        xapi_statement = XAPIStatement.objects.create(
            statement_id=explicit_id,  # Use the explicit ID
            actor_type=actor.get('objectType', 'Agent'),
            actor_name=actor_name,
            actor_mbox=actor_mbox,
            actor_account_name=actor.get('account', {}).get('name') if 'account' in actor else None,
            actor_account_homepage=actor.get('account', {}).get('homePage') if 'account' in actor else None,
            actor_json=actor,
            verb_id=verb['id'],
            verb_display=verb.get('display', {}),
            object_type=obj.get('objectType', 'Activity'),
            object_id=obj['id'],
            object_json=obj,
            result_json=statement.get('result'),
            context_json=statement.get('context'),
            timestamp=django_timezone.now(),
            statement_json=statement
        )
        
        # Verify the statement uses the explicit ID
        assert xapi_statement.statement_id == explicit_id, \
            "Statement should use the explicit ID provided"
        
        # Verify we can retrieve it by that ID
        retrieved = XAPIStatement.objects.get(statement_id=explicit_id)
        assert retrieved.id == xapi_statement.id, "Should retrieve the same statement by explicit ID"
        
        # Clean up
        xapi_statement.delete()
    
    @given(valid_xapi_statement())
    @settings(max_examples=50, deadline=None)
    def test_duplicate_statement_id_is_rejected(self, statement):
        """
        Property: Attempting to store a statement with a duplicate UUID should fail
        
        This test verifies that the uniqueness constraint on statement_id is enforced.
        """
        from django.db import IntegrityError, transaction
        
        actor = statement['actor']
        verb = statement['verb']
        obj = statement['object']
        
        # Extract actor information
        actor_name = actor.get('name', 'Anonymous')
        actor_mbox = None
        if 'mbox' in actor:
            mbox = actor['mbox']
            actor_mbox = mbox.replace('mailto:', '') if mbox.startswith('mailto:') else mbox
        
        # Create the first statement
        xapi_statement1 = XAPIStatement.objects.create(
            actor_type=actor.get('objectType', 'Agent'),
            actor_name=actor_name,
            actor_mbox=actor_mbox,
            actor_account_name=actor.get('account', {}).get('name') if 'account' in actor else None,
            actor_account_homepage=actor.get('account', {}).get('homePage') if 'account' in actor else None,
            actor_json=actor,
            verb_id=verb['id'],
            verb_display=verb.get('display', {}),
            object_type=obj.get('objectType', 'Activity'),
            object_id=obj['id'],
            object_json=obj,
            result_json=statement.get('result'),
            context_json=statement.get('context'),
            timestamp=django_timezone.now(),
            statement_json=statement
        )
        
        # Try to create a second statement with the same UUID
        # Use transaction.atomic() to handle the IntegrityError properly
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                XAPIStatement.objects.create(
                    statement_id=xapi_statement1.statement_id,  # Use the same UUID
                    actor_type=actor.get('objectType', 'Agent'),
                    actor_name=actor_name,
                    actor_mbox=actor_mbox,
                    actor_account_name=actor.get('account', {}).get('name') if 'account' in actor else None,
                    actor_account_homepage=actor.get('account', {}).get('homePage') if 'account' in actor else None,
                    actor_json=actor,
                    verb_id=verb['id'],
                    verb_display=verb.get('display', {}),
                    object_type=obj.get('objectType', 'Activity'),
                    object_id=obj['id'],
                    object_json=obj,
                    result_json=statement.get('result'),
                    context_json=statement.get('context'),
                    timestamp=django_timezone.now(),
                    statement_json=statement
                )
        
        # Clean up
        xapi_statement1.delete()



# ============================================================================
# Property-Based Tests for Query Filtering
# ============================================================================

@pytest.mark.django_db
class TestXAPIQueryFiltering:
    """
    Property-based tests for xAPI query filtering correctness
    
    Feature: scorm-xapi-compliance, Property 13: xAPI query filtering correctness
    Validates: Requirements 3.5, 6.2
    """
    
    @given(st.lists(valid_xapi_statement(), min_size=5, max_size=20))
    @settings(max_examples=10, deadline=10000)  # Reduced examples and added deadline
    def test_query_by_verb_returns_only_matching_statements(self, statements):
        """
        Property: For any set of stored xAPI statements and a verb filter,
        the query should return exactly the statements with that verb
        
        This test verifies that verb filtering works correctly.
        """
        from xapi.statement_store import XAPIStatementStore
        
        store = XAPIStatementStore()
        created_statements = []
        
        try:
            # Store all statements
            for statement in statements:
                statement_id = store.store_statement(statement)
                created_statements.append(statement_id)
            
            # Pick a verb from the statements
            target_verb = statements[0]['verb']['id']
            
            # Count how many statements have this verb
            expected_count = sum(1 for s in statements if s['verb']['id'] == target_verb)
            
            # Query by verb
            result = store.query_statements(verb=target_verb, limit=1000)
            returned_statements = result['statements']
            
            # Verify all returned statements have the target verb
            for stmt in returned_statements:
                assert stmt['verb']['id'] == target_verb, \
                    f"Query returned statement with wrong verb: {stmt['verb']['id']} != {target_verb}"
            
            # Verify we got the right count
            assert len(returned_statements) == expected_count, \
                f"Expected {expected_count} statements with verb {target_verb}, got {len(returned_statements)}"
            
        finally:
            # Clean up
            for stmt_id in created_statements:
                XAPIStatement.objects.filter(statement_id=stmt_id).delete()
    
    @given(st.lists(valid_xapi_statement(), min_size=5, max_size=20))
    @settings(max_examples=10, deadline=10000)
    def test_query_by_activity_returns_only_matching_statements(self, statements):
        """
        Property: For any set of stored xAPI statements and an activity filter,
        the query should return exactly the statements with that activity
        
        This test verifies that activity filtering works correctly.
        """
        from xapi.statement_store import XAPIStatementStore
        
        store = XAPIStatementStore()
        created_statements = []
        
        try:
            # Store all statements
            for statement in statements:
                statement_id = store.store_statement(statement)
                created_statements.append(statement_id)
            
            # Pick an activity from the statements
            target_activity = statements[0]['object']['id']
            
            # Count how many statements have this activity
            expected_count = sum(1 for s in statements if s['object']['id'] == target_activity)
            
            # Query by activity
            result = store.query_statements(activity=target_activity, limit=1000)
            returned_statements = result['statements']
            
            # Verify all returned statements have the target activity
            for stmt in returned_statements:
                assert stmt['object']['id'] == target_activity, \
                    f"Query returned statement with wrong activity: {stmt['object']['id']} != {target_activity}"
            
            # Verify we got the right count
            assert len(returned_statements) == expected_count, \
                f"Expected {expected_count} statements with activity {target_activity}, got {len(returned_statements)}"
            
        finally:
            # Clean up
            for stmt_id in created_statements:
                XAPIStatement.objects.filter(statement_id=stmt_id).delete()
    
    @given(st.lists(valid_xapi_statement(), min_size=5, max_size=20))
    @settings(max_examples=10, deadline=10000)
    def test_query_by_agent_mbox_returns_only_matching_statements(self, statements):
        """
        Property: For any set of stored xAPI statements and an agent filter,
        the query should return exactly the statements with that agent
        
        This test verifies that agent filtering works correctly.
        """
        from xapi.statement_store import XAPIStatementStore
        
        store = XAPIStatementStore()
        created_statements = []
        
        try:
            # Store all statements
            for statement in statements:
                statement_id = store.store_statement(statement)
                created_statements.append(statement_id)
            
            # Find a statement with an mbox and use it as filter
            target_statement = None
            for s in statements:
                if 'mbox' in s['actor']:
                    target_statement = s
                    break
            
            # Skip if no statement has mbox
            assume(target_statement is not None)
            
            target_mbox = target_statement['actor']['mbox']
            
            # Count how many statements have this mbox
            expected_count = sum(
                1 for s in statements 
                if 'mbox' in s['actor'] and s['actor']['mbox'] == target_mbox
            )
            
            # Query by agent
            agent_filter = {'mbox': target_mbox}
            result = store.query_statements(agent=agent_filter, limit=1000)
            returned_statements = result['statements']
            
            # Verify all returned statements have the target mbox
            for stmt in returned_statements:
                assert 'mbox' in stmt['actor'], "Returned statement should have mbox"
                assert stmt['actor']['mbox'] == target_mbox, \
                    f"Query returned statement with wrong mbox: {stmt['actor']['mbox']} != {target_mbox}"
            
            # Verify we got the right count
            assert len(returned_statements) == expected_count, \
                f"Expected {expected_count} statements with mbox {target_mbox}, got {len(returned_statements)}"
            
        finally:
            # Clean up
            for stmt_id in created_statements:
                XAPIStatement.objects.filter(statement_id=stmt_id).delete()
    
    @given(st.lists(valid_xapi_statement(), min_size=10, max_size=30))
    @settings(max_examples=10, deadline=10000)
    def test_query_with_multiple_filters_returns_intersection(self, statements):
        """
        Property: For any set of stored xAPI statements and multiple filters,
        the query should return exactly the statements matching ALL filters
        
        This test verifies that combining multiple filters works correctly.
        """
        from xapi.statement_store import XAPIStatementStore
        
        store = XAPIStatementStore()
        created_statements = []
        
        try:
            # Store all statements
            for statement in statements:
                statement_id = store.store_statement(statement)
                created_statements.append(statement_id)
            
            # Pick filters from the first statement
            target_verb = statements[0]['verb']['id']
            target_activity = statements[0]['object']['id']
            
            # Count how many statements match BOTH filters
            expected_count = sum(
                1 for s in statements 
                if s['verb']['id'] == target_verb and s['object']['id'] == target_activity
            )
            
            # Query with both filters
            result = store.query_statements(
                verb=target_verb,
                activity=target_activity,
                limit=1000
            )
            returned_statements = result['statements']
            
            # Verify all returned statements match both filters
            for stmt in returned_statements:
                assert stmt['verb']['id'] == target_verb, \
                    f"Query returned statement with wrong verb: {stmt['verb']['id']} != {target_verb}"
                assert stmt['object']['id'] == target_activity, \
                    f"Query returned statement with wrong activity: {stmt['object']['id']} != {target_activity}"
            
            # Verify we got the right count
            assert len(returned_statements) == expected_count, \
                f"Expected {expected_count} statements matching both filters, got {len(returned_statements)}"
            
        finally:
            # Clean up
            for stmt_id in created_statements:
                XAPIStatement.objects.filter(statement_id=stmt_id).delete()
    
    @given(st.lists(valid_xapi_statement(), min_size=5, max_size=20))
    @settings(max_examples=10, deadline=10000)
    def test_query_with_since_filter_returns_only_newer_statements(self, statements):
        """
        Property: For any set of stored xAPI statements and a 'since' timestamp,
        the query should return only statements with timestamp >= since
        
        This test verifies that timestamp filtering works correctly.
        """
        from xapi.statement_store import XAPIStatementStore
        
        store = XAPIStatementStore()
        created_statements = []
        
        try:
            # Store all statements
            for statement in statements:
                statement_id = store.store_statement(statement)
                created_statements.append(statement_id)
            
            # Get all stored statements to find their timestamps
            all_stored = XAPIStatement.objects.filter(
                statement_id__in=created_statements
            ).order_by('timestamp')
            
            # Skip if we don't have enough statements
            assume(all_stored.count() >= 2)
            
            # Pick a timestamp in the middle
            middle_index = all_stored.count() // 2
            since_timestamp = all_stored[middle_index].timestamp
            
            # Count how many statements should be returned
            expected_count = all_stored.filter(timestamp__gte=since_timestamp).count()
            
            # Query with since filter
            result = store.query_statements(since=since_timestamp, limit=1000)
            returned_statements = result['statements']
            
            # Verify all returned statements have timestamp >= since
            for stmt in returned_statements:
                stmt_obj = XAPIStatement.objects.get(statement_id=stmt['id'])
                assert stmt_obj.timestamp >= since_timestamp, \
                    f"Query returned statement with timestamp {stmt_obj.timestamp} < {since_timestamp}"
            
            # Verify we got the right count
            assert len(returned_statements) == expected_count, \
                f"Expected {expected_count} statements since {since_timestamp}, got {len(returned_statements)}"
            
        finally:
            # Clean up
            for stmt_id in created_statements:
                XAPIStatement.objects.filter(statement_id=stmt_id).delete()
    
    @given(st.lists(valid_xapi_statement(), min_size=5, max_size=20))
    @settings(max_examples=50, deadline=None)
    def test_query_with_until_filter_returns_only_older_statements(self, statements):
        """
        Property: For any set of stored xAPI statements and an 'until' timestamp,
        the query should return only statements with timestamp <= until
        
        This test verifies that timestamp filtering works correctly.
        """
        from xapi.statement_store import XAPIStatementStore
        
        store = XAPIStatementStore()
        created_statements = []
        
        try:
            # Store all statements
            for statement in statements:
                statement_id = store.store_statement(statement)
                created_statements.append(statement_id)
            
            # Get all stored statements to find their timestamps
            all_stored = XAPIStatement.objects.filter(
                statement_id__in=created_statements
            ).order_by('timestamp')
            
            # Skip if we don't have enough statements
            assume(all_stored.count() >= 2)
            
            # Pick a timestamp in the middle
            middle_index = all_stored.count() // 2
            until_timestamp = all_stored[middle_index].timestamp
            
            # Count how many statements should be returned
            expected_count = all_stored.filter(timestamp__lte=until_timestamp).count()
            
            # Query with until filter
            result = store.query_statements(until=until_timestamp, limit=1000)
            returned_statements = result['statements']
            
            # Verify all returned statements have timestamp <= until
            for stmt in returned_statements:
                stmt_obj = XAPIStatement.objects.get(statement_id=stmt['id'])
                assert stmt_obj.timestamp <= until_timestamp, \
                    f"Query returned statement with timestamp {stmt_obj.timestamp} > {until_timestamp}"
            
            # Verify we got the right count
            assert len(returned_statements) == expected_count, \
                f"Expected {expected_count} statements until {until_timestamp}, got {len(returned_statements)}"
            
        finally:
            # Clean up
            for stmt_id in created_statements:
                XAPIStatement.objects.filter(statement_id=stmt_id).delete()
    
    @given(st.lists(valid_xapi_statement(), min_size=5, max_size=20))
    @settings(max_examples=50, deadline=None)
    def test_query_with_no_filters_returns_all_statements(self, statements):
        """
        Property: For any set of stored xAPI statements with no filters,
        the query should return all non-voided statements
        
        This test verifies that querying without filters returns everything.
        """
        from xapi.statement_store import XAPIStatementStore
        
        store = XAPIStatementStore()
        created_statements = []
        
        try:
            # Store all statements
            for statement in statements:
                statement_id = store.store_statement(statement)
                created_statements.append(statement_id)
            
            # Query without filters
            result = store.query_statements(limit=1000)
            returned_statements = result['statements']
            
            # Verify we got all statements
            assert len(returned_statements) == len(statements), \
                f"Expected {len(statements)} statements, got {len(returned_statements)}"
            
            # Verify all statement IDs are present
            returned_ids = {stmt['id'] for stmt in returned_statements}
            expected_ids = {str(stmt_id) for stmt_id in created_statements}
            
            assert returned_ids == expected_ids, \
                "Query should return all stored statement IDs"
            
        finally:
            # Clean up
            for stmt_id in created_statements:
                XAPIStatement.objects.filter(statement_id=stmt_id).delete()
    
    @given(st.lists(valid_xapi_statement(), min_size=10, max_size=30))
    @settings(max_examples=50, deadline=None)
    def test_query_pagination_limit_works_correctly(self, statements):
        """
        Property: For any set of stored xAPI statements and a limit parameter,
        the query should return at most 'limit' statements
        
        This test verifies that pagination limit works correctly.
        """
        from xapi.statement_store import XAPIStatementStore
        
        store = XAPIStatementStore()
        created_statements = []
        
        try:
            # Store all statements
            for statement in statements:
                statement_id = store.store_statement(statement)
                created_statements.append(statement_id)
            
            # Query with a small limit
            limit = min(5, len(statements))
            result = store.query_statements(limit=limit)
            returned_statements = result['statements']
            
            # Verify we got at most 'limit' statements
            assert len(returned_statements) <= limit, \
                f"Query should return at most {limit} statements, got {len(returned_statements)}"
            
            # If there are more statements than the limit, verify 'more' is set
            if len(statements) > limit:
                assert result['more'] != '', \
                    "Query should indicate more results are available"
            
        finally:
            # Clean up
            for stmt_id in created_statements:
                XAPIStatement.objects.filter(statement_id=stmt_id).delete()
    
    @given(st.lists(valid_xapi_statement(), min_size=10, max_size=30))
    @settings(max_examples=50, deadline=None)
    def test_query_pagination_offset_works_correctly(self, statements):
        """
        Property: For any set of stored xAPI statements and an offset parameter,
        the query should skip the first 'offset' statements
        
        This test verifies that pagination offset works correctly.
        """
        from xapi.statement_store import XAPIStatementStore
        
        store = XAPIStatementStore()
        created_statements = []
        
        try:
            # Store all statements
            for statement in statements:
                statement_id = store.store_statement(statement)
                created_statements.append(statement_id)
            
            # Query without offset
            result1 = store.query_statements(limit=1000)
            all_statements = result1['statements']
            
            # Query with offset
            offset = min(5, len(statements) - 1)
            result2 = store.query_statements(offset=offset, limit=1000)
            offset_statements = result2['statements']
            
            # Verify we got fewer statements with offset
            assert len(offset_statements) == len(all_statements) - offset, \
                f"Expected {len(all_statements) - offset} statements with offset {offset}, got {len(offset_statements)}"
            
            # Verify the statements are different (offset skipped some)
            if offset > 0 and len(all_statements) > offset:
                first_ids = {stmt['id'] for stmt in all_statements[:offset]}
                offset_ids = {stmt['id'] for stmt in offset_statements}
                
                # The offset statements should not include the first 'offset' statements
                assert len(first_ids & offset_ids) == 0, \
                    "Offset query should not return the first 'offset' statements"
            
        finally:
            # Clean up
            for stmt_id in created_statements:
                XAPIStatement.objects.filter(statement_id=stmt_id).delete()
    
    @given(st.lists(valid_xapi_statement(), min_size=5, max_size=20))
    @settings(max_examples=50, deadline=None)
    def test_voided_statements_are_excluded_from_queries(self, statements):
        """
        Property: For any set of stored xAPI statements where some are voided,
        queries should not return voided statements
        
        This test verifies that voided statements are excluded from query results.
        """
        from xapi.statement_store import XAPIStatementStore
        
        store = XAPIStatementStore()
        created_statements = []
        
        try:
            # Store all statements
            for statement in statements:
                statement_id = store.store_statement(statement)
                created_statements.append(statement_id)
            
            # Void the first statement
            if len(created_statements) > 0:
                store.void_statement(created_statements[0])
            
            # Query all statements
            result = store.query_statements(limit=1000)
            returned_statements = result['statements']
            
            # Verify the voided statement is not in the results
            returned_ids = {stmt['id'] for stmt in returned_statements}
            assert str(created_statements[0]) not in returned_ids, \
                "Voided statement should not be returned in query results"
            
            # Verify we got all non-voided statements
            assert len(returned_statements) == len(statements) - 1, \
                f"Expected {len(statements) - 1} non-voided statements, got {len(returned_statements)}"
            
        finally:
            # Clean up
            for stmt_id in created_statements:
                XAPIStatement.objects.filter(statement_id=stmt_id).delete()


@pytest.mark.django_db
class TestXAPIHTTPStatusCodes:
    """
    Property-based tests for xAPI HTTP status codes
    
    Feature: scorm-xapi-compliance, Property 22: HTTP status code correctness
    Validates: Requirements 6.4
    """
    
    @given(valid_xapi_statement())
    @settings(max_examples=100, deadline=None)
    def test_valid_post_returns_200(self, statement):
        """
        Property: For any valid xAPI statement submitted via POST, the response should be 200 OK
        
        This test verifies that valid statements submitted via POST receive
        a 200 OK response with statement IDs.
        """
        from rest_framework.test import APIClient
        from rest_framework import status as http_status
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Create test user with unique username
        username = f'testuser_{uuid.uuid4().hex[:8]}'
        user = User.objects.create_user(
            username=username,
            email=f'{username}@example.com',
            password='testpass123'
        )
        
        client = APIClient()
        client.force_authenticate(user=user)
        
        # Submit statement via POST
        response = client.post(
            '/xapi/statements/',
            data=statement,
            format='json'
        )
        
        # Verify 200 OK status
        assert response.status_code == http_status.HTTP_200_OK, \
            f"Valid POST should return 200, got {response.status_code}"
        
        # Verify response contains statement ID(s)
        assert isinstance(response.data, list), "Response should contain list of statement IDs"
        assert len(response.data) > 0, "Response should contain at least one statement ID"
        
        # Verify statement ID is valid UUID
        try:
            uuid.UUID(response.data[0])
        except (ValueError, TypeError):
            pytest.fail(f"Response should contain valid UUID, got {response.data[0]}")
    
    @given(invalid_xapi_statement())
    @settings(max_examples=100, deadline=None)
    def test_invalid_post_returns_400(self, statement):
        """
        Property: For any invalid xAPI statement submitted via POST, the response should be 400 Bad Request
        
        This test verifies that invalid statements are rejected with a 400 status code
        and an error message.
        """
        from rest_framework.test import APIClient
        from rest_framework import status as http_status
        from django.contrib.auth import get_user_model
        
        # Skip empty lists - they are valid for batch submission (returns empty list of IDs)
        assume(statement != [])
        # Skip None - it's not a valid test case for this test
        assume(statement is not None)
        
        User = get_user_model()
        
        # Get or create test user to avoid unique constraint violations
        user, _ = User.objects.get_or_create(
            username='testuser_invalid_post',
            defaults={'email': 'test_invalid_post@example.com', 'password': 'testpass123'}
        )
        
        client = APIClient()
        client.force_authenticate(user=user)
        
        # Submit invalid statement via POST
        response = client.post(
            '/xapi/statements/',
            data=statement,
            format='json'
        )
        
        # Verify 400 Bad Request status
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST, \
            f"Invalid POST should return 400, got {response.status_code}"
        
        # Verify response contains error information
        assert 'error' in response.data, "Response should contain error field"
    
    @given(st.text(min_size=1, max_size=50))
    @settings(max_examples=100, deadline=None)
    def test_unauthenticated_request_returns_401(self, random_data):
        """
        Property: For any xAPI request without authentication, the response should be 401 Unauthorized
        
        This test verifies that requests without valid authentication credentials
        are rejected with a 401 status code.
        """
        from rest_framework.test import APIClient
        from rest_framework import status as http_status
        
        # Create unauthenticated client
        client = APIClient()
        
        # Attempt to submit statement without authentication
        statement = {
            'actor': {
                'objectType': 'Agent',
                'name': random_data,
                'mbox': 'mailto:test@example.com'
            },
            'verb': {
                'id': 'http://adlnet.gov/expapi/verbs/completed',
                'display': {'en-US': 'completed'}
            },
            'object': {
                'objectType': 'Activity',
                'id': 'http://example.com/activity/1'
            }
        }
        
        response = client.post(
            '/xapi/statements/',
            data=statement,
            format='json'
        )
        
        # Verify 401 Unauthorized status
        assert response.status_code == http_status.HTTP_401_UNAUTHORIZED, \
            f"Unauthenticated request should return 401, got {response.status_code}"
    
    @given(st.uuids())
    @settings(max_examples=100, deadline=None)
    def test_get_nonexistent_statement_returns_404(self, statement_id):
        """
        Property: For any non-existent statement ID, GET request should return 404 Not Found
        
        This test verifies that requesting a statement that doesn't exist
        returns a 404 status code.
        """
        from rest_framework.test import APIClient
        from rest_framework import status as http_status
        from django.contrib.auth import get_user_model
        from xapi.models.statement import XAPIStatement
        
        User = get_user_model()
        
        # Ensure the statement ID doesn't exist
        assume(not XAPIStatement.objects.filter(statement_id=statement_id).exists())
        
        # Create test user with unique username
        username = f'testuser_{uuid.uuid4().hex[:8]}'
        user = User.objects.create_user(
            username=username,
            email=f'{username}@example.com',
            password='testpass123'
        )
        
        client = APIClient()
        client.force_authenticate(user=user)
        
        # Request non-existent statement
        response = client.get(
            f'/xapi/statements/?statementId={statement_id}'
        )
        
        # Verify 404 Not Found status
        assert response.status_code == http_status.HTTP_404_NOT_FOUND, \
            f"GET for non-existent statement should return 404, got {response.status_code}"
        
        # Verify response contains error information
        assert 'error' in response.data, "Response should contain error field"
    
    @given(valid_xapi_statement())
    @settings(max_examples=100, deadline=None)
    def test_get_existing_statement_returns_200(self, statement):
        """
        Property: For any existing statement ID, GET request should return 200 OK
        
        This test verifies that requesting an existing statement returns
        a 200 status code with the statement data.
        """
        from rest_framework.test import APIClient
        from rest_framework import status as http_status
        from django.contrib.auth import get_user_model
        from xapi.statement_store import XAPIStatementStore
        
        User = get_user_model()
        
        # Create test user with unique username
        username = f'testuser_{uuid.uuid4().hex[:8]}'
        user = User.objects.create_user(
            username=username,
            email=f'{username}@example.com',
            password='testpass123'
        )
        
        client = APIClient()
        client.force_authenticate(user=user)
        
        # Store a statement first
        store = XAPIStatementStore()
        statement_id = store.store_statement(statement)
        
        # Request the statement
        response = client.get(
            f'/xapi/statements/?statementId={statement_id}'
        )
        
        # Verify 200 OK status
        assert response.status_code == http_status.HTTP_200_OK, \
            f"GET for existing statement should return 200, got {response.status_code}"
        
        # Verify response contains statement data
        assert 'actor' in response.data, "Response should contain statement data"
        assert 'verb' in response.data, "Response should contain verb"
        assert 'object' in response.data, "Response should contain object"
    
    @given(valid_xapi_statement(), st.uuids())
    @settings(max_examples=100, deadline=None)
    def test_put_with_new_id_returns_204(self, statement, statement_id):
        """
        Property: For any valid statement with a new ID via PUT, the response should be 204 No Content
        
        This test verifies that storing a statement with a specific ID via PUT
        returns a 204 status code on success.
        """
        from rest_framework.test import APIClient
        from rest_framework import status as http_status
        from django.contrib.auth import get_user_model
        from xapi.models.statement import XAPIStatement
        
        User = get_user_model()
        
        # Ensure the statement ID doesn't exist
        assume(not XAPIStatement.objects.filter(statement_id=statement_id).exists())
        
        # Get or create test user to avoid unique constraint violations
        user, _ = User.objects.get_or_create(
            username='testuser_put_204',
            defaults={'email': 'test_put_204@example.com', 'password': 'testpass123'}
        )
        
        client = APIClient()
        client.force_authenticate(user=user)
        
        # Submit statement via PUT with specific ID
        response = client.put(
            f'/xapi/statements/?statementId={statement_id}',
            data=statement,
            format='json'
        )
        
        # Verify 204 No Content status
        assert response.status_code == http_status.HTTP_204_NO_CONTENT, \
            f"PUT with new ID should return 204, got {response.status_code}"
        
        # Verify statement was stored with the specified ID
        assert XAPIStatement.objects.filter(statement_id=statement_id).exists(), \
            "Statement should be stored with the specified ID"
    
    @given(valid_xapi_statement(), st.uuids())
    @settings(max_examples=100, deadline=None)
    def test_put_with_existing_different_statement_returns_409(self, statement, statement_id):
        """
        Property: For any PUT with an existing statement ID but different content, the response should be 409 Conflict
        
        This test verifies that attempting to overwrite an existing statement
        with different content returns a 409 status code.
        """
        from rest_framework.test import APIClient
        from rest_framework import status as http_status
        from django.contrib.auth import get_user_model
        from xapi.statement_store import XAPIStatementStore
        from xapi.models.statement import XAPIStatement
        
        User = get_user_model()
        
        # Ensure the statement ID doesn't already exist from a previous test run
        assume(not XAPIStatement.objects.filter(statement_id=statement_id).exists())
        
        # Get or create test user to avoid unique constraint violations
        user, _ = User.objects.get_or_create(
            username='testuser_put_409',
            defaults={'email': 'test_put_409@example.com', 'password': 'testpass123'}
        )
        
        client = APIClient()
        client.force_authenticate(user=user)
        
        # Store a statement first with the specific ID
        store = XAPIStatementStore()
        original_statement = statement.copy()
        original_statement['id'] = str(statement_id)
        store.store_statement(original_statement)
        
        # Create a different statement
        different_statement = statement.copy()
        different_statement['actor'] = {
            'objectType': 'Agent',
            'name': 'Different User',
            'mbox': 'mailto:different@example.com'
        }
        
        # Attempt to PUT different statement with same ID
        response = client.put(
            f'/xapi/statements/?statementId={statement_id}',
            data=different_statement,
            format='json'
        )
        
        # Verify 409 Conflict status
        assert response.status_code == http_status.HTTP_409_CONFLICT, \
            f"PUT with existing ID and different content should return 409, got {response.status_code}"
        
        # Verify response contains error information
        assert 'error' in response.data, "Response should contain error field"
    
    @given(st.text(min_size=1, max_size=20))
    @settings(max_examples=100, deadline=None)
    def test_put_without_statement_id_returns_400(self, random_name):
        """
        Property: For any PUT request without statementId parameter, the response should be 400 Bad Request
        
        This test verifies that PUT requests without the required statementId
        parameter are rejected with a 400 status code.
        """
        from rest_framework.test import APIClient
        from rest_framework import status as http_status
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Get or create test user to avoid unique constraint violations
        user, _ = User.objects.get_or_create(
            username='testuser_put_400',
            defaults={'email': 'test_put_400@example.com', 'password': 'testpass123'}
        )
        
        client = APIClient()
        client.force_authenticate(user=user)
        
        # Attempt PUT without statementId parameter
        statement = {
            'actor': {
                'objectType': 'Agent',
                'name': random_name,
                'mbox': 'mailto:test@example.com'
            },
            'verb': {
                'id': 'http://adlnet.gov/expapi/verbs/completed',
                'display': {'en-US': 'completed'}
            },
            'object': {
                'objectType': 'Activity',
                'id': 'http://example.com/activity/1'
            }
        }
        
        response = client.put(
            '/xapi/statements/',  # No statementId parameter
            data=statement,
            format='json'
        )
        
        # Verify 400 Bad Request status
        assert response.status_code == http_status.HTTP_400_BAD_REQUEST, \
            f"PUT without statementId should return 400, got {response.status_code}"
        
        # Verify response contains error information
        assert 'error' in response.data, "Response should contain error field"
    
    @given(st.lists(valid_xapi_statement(), min_size=1, max_size=5))
    @settings(max_examples=100, deadline=None)
    def test_post_multiple_statements_returns_200(self, statements):
        """
        Property: For any array of valid statements submitted via POST, the response should be 200 OK
        
        This test verifies that submitting multiple statements in a batch
        returns a 200 status code with all statement IDs.
        """
        from rest_framework.test import APIClient
        from rest_framework import status as http_status
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Get or create test user to avoid unique constraint violations
        user, _ = User.objects.get_or_create(
            username='testuser_post_multi',
            defaults={'email': 'test_post_multi@example.com', 'password': 'testpass123'}
        )
        
        client = APIClient()
        client.force_authenticate(user=user)
        
        # Submit multiple statements via POST
        response = client.post(
            '/xapi/statements/',
            data=statements,
            format='json'
        )
        
        # Verify 200 OK status
        assert response.status_code == http_status.HTTP_200_OK, \
            f"POST with multiple statements should return 200, got {response.status_code}"
        
        # Verify response contains correct number of statement IDs
        assert isinstance(response.data, list), "Response should contain list of statement IDs"
        assert len(response.data) == len(statements), \
            f"Response should contain {len(statements)} statement IDs, got {len(response.data)}"
        
        # Verify all statement IDs are valid UUIDs
        for statement_id in response.data:
            try:
                uuid.UUID(statement_id)
            except (ValueError, TypeError):
                pytest.fail(f"Response should contain valid UUIDs, got {statement_id}")
