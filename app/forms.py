from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField, DecimalField
from wtforms.validators import DataRequired

class ThreshForm(FlaskForm):
    thresh  = DecimalField('Threshold', validators = [DataRequired()])
    submit = SubmitField('Submit')
